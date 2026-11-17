import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap } from '#shared';
import type { CartService } from '#modules/cart/server.ts';
import type { MarketingService } from '#modules/marketing/server.ts';
import type { ProductVariantFixture, ProductVariantFixtureOptions } from '../support/database.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface CartContractContext {
	service: CartService;
	marketing: MarketingService;
	clock: TestClock;
	reset(): Promise<void>;
	createProductWithVariant(options?: ProductVariantFixtureOptions): Promise<ProductVariantFixture>;
}

export function runCartContract(context: CartContractContext): void {
	const { service, marketing, clock, reset, createProductWithVariant } = context;
	const admin = createAdminActor('cart-admin');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	async function guestCart(): Promise<string> {
		return unwrap(await service.resolveCart({ userId: null, cookieCartId: null }));
	}

	function product(
		sku: string,
		stock: number,
		priceCents = 1000,
		status: 'active' | 'inactive' = 'active'
	) {
		return createProductWithVariant({
			product: { sku, slug: sku.toLowerCase(), name: `Product ${sku}`, status: 'active' },
			variant: { sku: `${sku}-V`, stock, priceCents, status }
		});
	}

	describe('resolving carts', () => {
		test('guests reuse their cookie cart and get a fresh one otherwise', async () => {
			const first = await guestCart();
			expect(unwrap(await service.resolveCart({ userId: null, cookieCartId: first }))).toBe(first);
			const other = unwrap(await service.resolveCart({ userId: null, cookieCartId: 'nope' }));
			expect(other).not.toBe(first);
		});

		test('a converted cart is never reused', async () => {
			const cartId = await guestCart();
			unwrap(await service.markConverted(cartId));
			expect(unwrap(await service.resolveCart({ userId: null, cookieCartId: cartId }))).not.toBe(
				cartId
			);
		});

		test('signed-in users keep one active cart across visits', async () => {
			const first = unwrap(await service.resolveCart({ userId: 'u1', cookieCartId: null }));
			const again = unwrap(await service.resolveCart({ userId: 'u1', cookieCartId: null }));
			expect(again).toBe(first);
			expect(unwrap(await service.resolveCart({ userId: 'u2', cookieCartId: null }))).not.toBe(
				first
			);
		});

		test('signing in merges the guest cart, clamped to stock, and abandons it', async () => {
			const a = await product('MERGE-A', 3);
			const b = await product('MERGE-B', 5);
			const third = await product('MERGE-C', 2);

			const userCart = unwrap(await service.resolveCart({ userId: 'u1', cookieCartId: null }));
			unwrap(await service.addItem(userCart, { variantId: a.variantId, quantity: 2 }));

			const guest = await guestCart();
			unwrap(await service.addItem(guest, { variantId: a.variantId, quantity: 2 }));
			unwrap(await service.addItem(guest, { variantId: b.variantId, quantity: 4 }));
			unwrap(await service.addItem(guest, { variantId: third.variantId, quantity: 1 }));

			const merged = unwrap(await service.resolveCart({ userId: 'u1', cookieCartId: guest }));
			expect(merged).toBe(userCart);

			const cart = unwrap(await service.getCart(merged));
			const quantities = Object.fromEntries(cart.items.map((i) => [i.variantId, i.quantity]));
			expect(quantities).toEqual({
				[a.variantId]: 3,
				[b.variantId]: 4,
				[third.variantId]: 1
			});

			expect(unwrap(await service.getCart(guest)).items).toEqual([]);
			expect(unwrap(await service.resolveCart({ userId: null, cookieCartId: guest }))).not.toBe(
				guest
			);
		});
	});

	describe('items', () => {
		test('adds, accumulates and totals items with product details', async () => {
			const p = await product('ITEM-A', 10, 2500);
			const cartId = await guestCart();

			unwrap(await service.addItem(cartId, { variantId: p.variantId, quantity: 2 }));
			const cart = unwrap(await service.addItem(cartId, { variantId: p.variantId, quantity: 1 }));

			expect(cart.items).toHaveLength(1);
			expect(cart.items[0]).toMatchObject({
				productName: 'Product ITEM-A',
				quantity: 3,
				unitPriceCents: 2500,
				stock: 10
			});
			expect(cart).toMatchObject({ subtotalCents: 7500, totalCents: 7500, itemCount: 3 });
		});

		test('rejects unknown, inactive and over-stock additions', async () => {
			const stocked = await product('ITEM-B', 2);
			const inactive = await product('ITEM-C', 5, 1000, 'inactive');
			const cartId = await guestCart();

			const cases: Array<[string, number, number, string]> = [
				['missing', 1, 404, 'Variant not found'],
				[inactive.variantId, 1, 422, 'Variant is not available'],
				[stocked.variantId, 3, 422, 'Insufficient stock']
			];
			for (const [variantId, quantity, status, message] of cases) {
				const result = await service.addItem(cartId, { variantId, quantity });
				expect(result.ok).toBe(false);
				if (!result.ok) expect(result.error).toMatchObject({ status, message });
			}
		});

		test('updates quantity, removes at zero and reports unknown items', async () => {
			const p = await product('ITEM-D', 4);
			const cartId = await guestCart();
			const added = unwrap(await service.addItem(cartId, { variantId: p.variantId, quantity: 1 }));
			const itemId = added.items[0]!.id;

			expect(unwrap(await service.updateItem(cartId, itemId, 3)).items[0]?.quantity).toBe(3);
			const over = await service.updateItem(cartId, itemId, 5);
			expect(over.ok).toBe(false);
			expect(unwrap(await service.updateItem(cartId, itemId, 0)).items).toEqual([]);

			const missing = await service.updateItem(cartId, 'nope', 1);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);
		});

		test('removes an item and clears a cart; other carts are untouched', async () => {
			const p = await product('ITEM-E', 4);
			const mine = await guestCart();
			const theirs = await guestCart();
			const item = unwrap(await service.addItem(mine, { variantId: p.variantId, quantity: 1 }));
			unwrap(await service.addItem(theirs, { variantId: p.variantId, quantity: 1 }));

			unwrap(await service.removeItem(theirs, item.items[0]!.id));
			expect(unwrap(await service.getCart(mine)).items).toHaveLength(1);

			expect(unwrap(await service.clearCart(mine)).items).toEqual([]);
			expect(unwrap(await service.getCart(theirs)).items).toHaveLength(1);
		});

		test('unknown carts read as empty', async () => {
			const cartId = await guestCart();
			const cart = unwrap(await service.getCart('unknown-cart'));
			expect(cart).toMatchObject({ id: 'unknown-cart', items: [], currency: 'IDR' });
			expect(unwrap(await service.getCart(cartId)).items).toEqual([]);
		});
	});

	describe('coupons', () => {
		const coupon = {
			code: 'save10',
			type: 'percentage' as const,
			value: 10,
			minSubtotalCents: 2000,
			status: 'active' as const
		};

		test('applies a coupon, shows the discount and removes it', async () => {
			unwrap(await marketing.createCoupon(coupon, admin));
			const p = await product('COUP-A', 10, 3000);
			const cartId = await guestCart();
			unwrap(await service.addItem(cartId, { variantId: p.variantId, quantity: 1 }));

			const applied = unwrap(await service.applyCoupon(cartId, ' save10 '));
			expect(applied.coupon).toMatchObject({ code: 'SAVE10', type: 'percentage', value: 10 });
			expect(applied).toMatchObject({ subtotalCents: 3000, discountCents: 300, totalCents: 2700 });

			const removed = unwrap(await service.removeCoupon(cartId));
			expect(removed).toMatchObject({ coupon: null, discountCents: 0, totalCents: 3000 });
		});

		test('refuses coupons that do not apply, with the reason', async () => {
			unwrap(await marketing.createCoupon(coupon, admin));
			const p = await product('COUP-B', 10, 500);
			const cartId = await guestCart();
			unwrap(await service.addItem(cartId, { variantId: p.variantId, quantity: 1 }));

			const below = await service.applyCoupon(cartId, 'SAVE10');
			expect(below.ok).toBe(false);
			if (!below.ok) {
				expect(below.error).toMatchObject({
					status: 422,
					message: 'Cart subtotal is below the coupon minimum'
				});
			}
			const unknown = await service.applyCoupon(cartId, 'NOPE');
			expect(unknown.ok).toBe(false);
			if (!unknown.ok) expect(unknown.error.status).toBe(404);
		});

		test('the discount drops out when the cart falls below the minimum', async () => {
			unwrap(await marketing.createCoupon(coupon, admin));
			const p = await product('COUP-C', 10, 1500);
			const cartId = await guestCart();
			const added = unwrap(await service.addItem(cartId, { variantId: p.variantId, quantity: 2 }));
			unwrap(await service.applyCoupon(cartId, 'SAVE10'));

			const reduced = unwrap(await service.updateItem(cartId, added.items[0]!.id, 1));
			expect(reduced).toMatchObject({ discountCents: 0, totalCents: 1500 });
			expect(reduced.coupon?.code).toBe('SAVE10');
		});
	});
}
