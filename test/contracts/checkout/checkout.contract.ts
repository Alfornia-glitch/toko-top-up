import { beforeEach, describe, expect, test } from 'vitest';
import { err, unwrap, ConflictError, type Actor } from '#shared';
import type { CartService } from '#modules/cart/server.ts';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { CheckoutService } from '#modules/checkout/server.ts';
import type { CustomersServices } from '#modules/customers/server.ts';
import type { MarketingService } from '#modules/marketing/server.ts';
import type { OrdersService } from '#modules/orders/server.ts';
import type { ProductVariantFixture, ProductVariantFixtureOptions } from '../support/database.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface CheckoutContractContext {
	/** Builds the checkout service; overrides let a test make a dependency fail. */
	createCheckout(overrides?: {
		orders?: Partial<OrdersService>;
		marketing?: Partial<MarketingService>;
	}): CheckoutService;
	cart: CartService;
	catalog: CatalogServices;
	customers: CustomersServices['customers'];
	marketing: MarketingService;
	orders: OrdersService;
	clock: TestClock;
	reset(): Promise<void>;
	createProductWithVariant(options?: ProductVariantFixtureOptions): Promise<ProductVariantFixture>;
}

export function runCheckoutContract(context: CheckoutContractContext): void {
	const { createCheckout, cart, catalog, customers, marketing, orders, clock, reset } = context;
	const admin = createAdminActor('user-admin');
	const ada: Actor = createForbiddenActor('user-ada');
	const bob: Actor = createForbiddenActor('user-bob');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	function product(sku: string, stock: number, priceCents = 1000) {
		return context.createProductWithVariant({
			product: { sku, slug: sku.toLowerCase(), name: `Product ${sku}`, status: 'active' },
			variant: { sku: `${sku}-V`, stock, priceCents }
		});
	}

	async function stockOf(variantId: string): Promise<number> {
		const result = await catalog.inventory.list(
			{ page: 1, pageSize: 10, variantId, lowStock: false },
			admin
		);
		if (!result.ok) throw result.error;
		return result.value.data[0]?.stock ?? -1;
	}

	async function addressFor(actor: Actor): Promise<string> {
		return unwrap(
			await customers.createAddress(
				{
					recipientName: 'Ada',
					line1: '1 Main St',
					city: 'Jakarta',
					country: 'ID',
					isDefaultShipping: true
				},
				actor
			)
		).id;
	}

	async function cartWith(actor: Actor, variantId: string, quantity: number): Promise<string> {
		const cartId = unwrap(await cart.resolveCart({ userId: actor.id, cookieCartId: null }));
		unwrap(await cart.addItem(cartId, { variantId, quantity }));
		return cartId;
	}

	const input = (addressId: string, shippingId = 'standard') => ({ addressId, shippingId });

	describe('placing an order', () => {
		test('creates the order, takes stock, converts the cart and snapshots the address', async () => {
			const p = await product('CHK-A', 5, 1500);
			const addressId = await addressFor(ada);
			const cartId = await cartWith(ada, p.variantId, 2);

			const placed = unwrap(
				await createCheckout().placeOrder(
					cartId,
					{ ...input(addressId), note: 'Leave at door' },
					ada
				)
			);

			const order = unwrap(await orders.getOrder(placed.orderId, admin));
			expect(order).toMatchObject({
				orderNumber: placed.orderNumber,
				userId: 'user-ada',
				status: 'paid',
				paymentStatus: 'paid',
				subtotalCents: 3000,
				discountCents: 0,
				shippingCents: 500,
				grandTotalCents: 3500,
				notes: 'Leave at door',
				shippingAddressJson: { id: addressId, line1: '1 Main St', city: 'Jakarta' }
			});
			expect(order.items[0]).toMatchObject({
				productNameSnapshot: 'Product CHK-A',
				skuSnapshot: 'CHK-A-V',
				quantity: 2,
				unitPriceCents: 1500,
				totalCents: 3000
			});
			expect(order.payments[0]).toMatchObject({ provider: 'mock', status: 'succeeded' });

			expect(await stockOf(p.variantId)).toBe(3);
			const movements = await catalog.inventory.listMovements(
				{ page: 1, pageSize: 10, variantId: p.variantId },
				admin
			);
			expect(movements.ok && movements.value.data[0]).toMatchObject({
				delta: -2,
				reason: 'order',
				referenceType: 'order',
				referenceId: placed.orderId
			});

			expect(unwrap(await cart.resolveCart({ userId: 'user-ada', cookieCartId: cartId }))).not.toBe(
				cartId
			);
		});

		test('applies and redeems a coupon', async () => {
			const p = await product('CHK-B', 5, 2000);
			const addressId = await addressFor(ada);
			const couponId = unwrap(
				await marketing.createCoupon(
					{ code: 'SAVE10', type: 'percentage', value: 10, minSubtotalCents: 0, status: 'active' },
					admin
				)
			);
			const cartId = await cartWith(ada, p.variantId, 1);
			unwrap(await cart.applyCoupon(cartId, 'SAVE10'));

			const placed = unwrap(await createCheckout().placeOrder(cartId, input(addressId), ada));

			const order = unwrap(await orders.getOrder(placed.orderId, admin));
			expect(order).toMatchObject({ discountCents: 200, couponId, grandTotalCents: 2300 });
			expect(unwrap(await marketing.getCouponById(couponId))?.usedCount).toBe(1);
		});
	});

	describe('validation', () => {
		test('rejects an empty cart, unknown address and unknown shipping without side effects', async () => {
			const p = await product('CHK-C', 5);
			const addressId = await addressFor(ada);
			const emptyCart = unwrap(await cart.resolveCart({ userId: 'user-ada', cookieCartId: null }));
			const cartId = await cartWith(bob, p.variantId, 1);

			const cases: Array<[Promise<unknown>, number, string]> = [
				[createCheckout().placeOrder(emptyCart, input(addressId), ada), 409, 'Your cart is empty'],
				[createCheckout().placeOrder(cartId, input(addressId), bob), 404, 'Address not found'],
				[
					createCheckout().placeOrder(cartId, input(await addressFor(bob), 'teleport'), bob),
					422,
					'Unknown shipping method'
				]
			];
			for (const [pending, status, message] of cases) {
				const result = (await pending) as {
					ok: boolean;
					error?: { status: number; message: string };
				};
				expect(result.ok).toBe(false);
				expect(result.error).toMatchObject({ status, message });
			}
			expect(await stockOf(p.variantId)).toBe(5);
			expect(unwrap(await orders.listOrders({ page: 1, pageSize: 10 }, admin)).total).toBe(0);
		});

		test('requires a signed-in buyer', async () => {
			const result = await createCheckout().placeOrder('any', input('any'), null);
			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error.status).toBe(401);
		});

		test('refuses when stock fell below the cart quantity', async () => {
			const p = await product('CHK-D', 3);
			const addressId = await addressFor(ada);
			const cartId = await cartWith(ada, p.variantId, 3);
			unwrap(
				await catalog.inventory.adjust(
					{ variantId: p.variantId, delta: -2, reason: 'Sold elsewhere' },
					admin
				)
			);

			const result = await createCheckout().placeOrder(cartId, input(addressId), ada);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.error).toMatchObject({
					status: 409,
					message: 'Insufficient stock for Product CHK-D'
				});
			}
			expect(await stockOf(p.variantId)).toBe(1);
		});
	});

	describe('compensation', () => {
		test('releases the reserved stock when the order cannot be created', async () => {
			const p = await product('CHK-E', 5);
			const addressId = await addressFor(ada);
			const cartId = await cartWith(ada, p.variantId, 2);

			const result = await createCheckout({
				orders: { createOrder: async () => err(new ConflictError('Orders unavailable')) }
			}).placeOrder(cartId, input(addressId), ada);

			expect(result.ok).toBe(false);
			if (!result.ok) expect(result.error.message).toBe('Orders unavailable');
			expect(await stockOf(p.variantId)).toBe(5);

			const movements = await catalog.inventory.listMovements(
				{ page: 1, pageSize: 10, variantId: p.variantId },
				admin
			);
			expect(movements.ok && movements.value.data.map((m) => m.reason).sort()).toEqual([
				'order',
				'order_cancelled'
			]);
			expect(unwrap(await cart.getCart(cartId)).items).toHaveLength(1);
		});

		test('cancels the order and releases stock when redemption loses a race', async () => {
			const p = await product('CHK-F', 10, 2000);
			const couponId = unwrap(
				await marketing.createCoupon(
					{ code: 'ONCE', type: 'fixed', value: 500, minSubtotalCents: 0, status: 'active' },
					admin
				)
			);
			const addressId = await addressFor(bob);
			const cartId = await cartWith(bob, p.variantId, 2);
			unwrap(await cart.applyCoupon(cartId, 'ONCE'));

			// Another buyer takes the last use between validation and redemption.
			const failed = await createCheckout({
				marketing: {
					redeemCoupon: async () => err(new ConflictError('Coupon usage limit reached'))
				}
			}).placeOrder(cartId, input(addressId), bob);

			expect(failed.ok).toBe(false);
			if (!failed.ok) {
				expect(failed.error).toMatchObject({ status: 409, message: 'Coupon usage limit reached' });
			}

			expect(await stockOf(p.variantId)).toBe(10);
			expect(unwrap(await marketing.getCouponById(couponId))?.usedCount).toBe(0);

			const mine = unwrap(await orders.listMyOrders({ page: 1, pageSize: 10 }, bob));
			expect(mine.data).toHaveLength(1);
			expect(mine.data[0]).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded' });
			expect(unwrap(await cart.getCart(cartId)).items).toHaveLength(1);
			expect(unwrap(await cart.resolveCart({ userId: 'user-bob', cookieCartId: cartId }))).toBe(
				cartId
			);
		});

		test('a coupon used up before checkout simply drops its discount', async () => {
			const p = await product('CHK-H', 10, 2000);
			unwrap(
				await marketing.createCoupon(
					{
						code: 'ONCE',
						type: 'fixed',
						value: 500,
						minSubtotalCents: 0,
						maxUses: 1,
						status: 'active'
					},
					admin
				)
			);
			const adaAddress = await addressFor(ada);
			const bobAddress = await addressFor(bob);
			const adaCart = await cartWith(ada, p.variantId, 1);
			const bobCart = await cartWith(bob, p.variantId, 1);
			unwrap(await cart.applyCoupon(adaCart, 'ONCE'));
			unwrap(await cart.applyCoupon(bobCart, 'ONCE'));

			unwrap(await createCheckout().placeOrder(adaCart, input(adaAddress), ada));
			const placed = unwrap(await createCheckout().placeOrder(bobCart, input(bobAddress), bob));

			const order = unwrap(await orders.getOrder(placed.orderId, admin));
			expect(order).toMatchObject({ discountCents: 0, couponId: null, grandTotalCents: 2500 });
		});
	});

	describe('concurrency', () => {
		test('two buyers of the last unit cannot both succeed', async () => {
			const p = await product('CHK-G', 1);
			const adaAddress = await addressFor(ada);
			const bobAddress = await addressFor(bob);
			const adaCart = await cartWith(ada, p.variantId, 1);
			const bobCart = await cartWith(bob, p.variantId, 1);

			const outcomes = await Promise.all([
				createCheckout().placeOrder(adaCart, input(adaAddress), ada),
				createCheckout().placeOrder(bobCart, input(bobAddress), bob)
			]);

			expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(1);
			expect(await stockOf(p.variantId)).toBe(0);
		});
	});
}
