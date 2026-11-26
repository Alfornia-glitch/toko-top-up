import {
	ConflictError,
	UnprocessableError,
	assertActor,
	err,
	newId,
	ok,
	toAppError,
	unwrap,
	type Actor,
	type AppError,
	type Result
} from '#shared';
import type { Cart } from '#modules/cart/index.ts';
import type { CartServices } from '#modules/cart/server.ts';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { Address } from '#modules/customers/index.ts';
import type { CustomersServices } from '#modules/customers/server.ts';
import type { MarketingServices } from '#modules/marketing/server.ts';
import type { OrdersServices } from '#modules/orders/server.ts';
import {
	validateAccountDetails,
	type AccountDetail,
	type CheckoutInput,
	type CheckoutSettings,
	type OrderLine,
	type PlacedOrder
} from '../domain/checkout.ts';

export interface CheckoutDependencies {
	cart: Pick<CartServices, 'cart'>;
	catalog: Pick<CatalogServices, 'products' | 'inventory'>;
	customers: Pick<CustomersServices, 'customers'>;
	marketing: Pick<MarketingServices, 'marketing'>;
	orders: Pick<OrdersServices, 'orders'>;
	settings: CheckoutSettings;
}

export interface CheckoutService {
	/**
	 * Turns the cart into a paid order:
	 *
	 * 1. validate the cart and either the address and shipping method or, for
	 *    a top-up store, the account details form;
	 * 2. reserve stock (guarded, so it cannot oversell);
	 * 3. create the order, its items and payment;
	 * 4. redeem the coupon, when one applies;
	 * 5. mark the cart converted.
	 *
	 * A failure in step 3 or 4 releases the reserved stock and cancels the
	 * order, so no step is left half-done.
	 */
	placeOrder(
		cartId: string,
		input: CheckoutInput,
		actor: Actor | null
	): Promise<Result<PlacedOrder, AppError>>;
}

interface Snapshot {
	variantId: string;
	productId: string;
	sku: string;
	price: number;
	stock: number;
	productName: string;
	imageUrl: string | null;
}

function resolveLines(cart: Cart, snapshots: Map<string, Snapshot>) {
	const lines: OrderLine[] = [];
	let subtotal = 0;

	for (const item of cart.items) {
		const variant = snapshots.get(item.variantId);
		if (!variant)
			throw new ConflictError('A product in your cart is no longer available', {
				messageKey: 'cart_item_unavailable'
			});
		if (variant.stock < item.quantity) {
			throw new ConflictError(`Insufficient stock for ${variant.productName}`, {
				messageKey: 'insufficient_stock_product',
				params: { product: variant.productName }
			});
		}

		const total = variant.price * item.quantity;
		subtotal += total;
		lines.push({
			productId: variant.productId,
			variantId: variant.variantId,
			productNameSnapshot: variant.productName,
			skuSnapshot: variant.sku,
			imageUrlSnapshot: variant.imageUrl,
			quantity: item.quantity,
			unitPrice: variant.price,
			total
		});
	}

	return { lines, subtotal };
}

/** Top-up orders store the account details where a delivery address would go. */
function accountSnapshot(details: AccountDetail[]): Record<string, unknown> {
	return { type: 'account', accountDetails: details };
}

function addressSnapshot(address: Address): Record<string, unknown> {
	return {
		id: address.id,
		label: address.label,
		recipientName: address.recipientName,
		phone: address.phone,
		line1: address.line1,
		line2: address.line2,
		city: address.city,
		region: address.region,
		postalCode: address.postalCode,
		country: address.country
	};
}

export function createCheckoutService(dependencies: CheckoutDependencies): CheckoutService {
	const { cart, catalog, customers, marketing, orders, settings } = dependencies;

	return {
		async placeOrder(cartId, input, actor) {
			try {
				const buyer = assertActor(actor);
				const current = unwrap(await cart.cart.getCart(cartId));
				if (current.items.length === 0)
					throw new ConflictError('Your cart is empty', { messageKey: 'cart_empty' });

				let destination: Record<string, unknown>;
				let shipping: number;
				const accountForm = await settings.getAccountForm();

				if (accountForm) {
					destination = accountSnapshot(validateAccountDetails(accountForm, input.accountDetails));
					shipping = 0;
				} else {
					if (!input.addressId)
						throw new UnprocessableError('A delivery address is required', {
							messageKey: 'address_required'
						});
					const address = unwrap(await customers.customers.getAddress(input.addressId, buyer));

					const method = input.shippingId
						? await settings.getShippingMethod(input.shippingId)
						: null;
					if (!method)
						throw new UnprocessableError('Unknown shipping method', {
							messageKey: 'shipping_method_unknown'
						});

					destination = addressSnapshot(address);
					shipping = method.price;
				}

				const variantIds = [...new Set(current.items.map((item) => item.variantId))];
				const rows = unwrap(await catalog.products.getVariantSnapshots(variantIds));
				const snapshots = new Map<string, Snapshot>(
					rows.map((row) => [
						row.variantId,
						{
							variantId: row.variantId,
							productId: row.productId,
							sku: row.sku,
							price: row.price,
							stock: row.stock,
							productName: row.productName,
							imageUrl: row.imageUrl
						}
					])
				);
				const { lines, subtotal } = resolveLines(current, snapshots);

				const discount = Math.max(0, Math.min(current.discount, subtotal));
				const grandTotal = subtotal - discount + shipping;

				let couponId: string | null = null;
				if (discount > 0 && current.coupon) {
					const coupon = unwrap(await marketing.marketing.getCouponByCode(current.coupon.code));
					couponId = coupon?.id ?? null;
				}

				const orderId = newId();
				const stockLines = lines.map((line) => ({
					variantId: line.variantId,
					quantity: line.quantity
				}));
				const reference = { type: 'order', id: orderId };

				unwrap(await catalog.inventory.reserve(stockLines, reference));

				async function undo(cause: unknown, orderCreated: boolean): Promise<never> {
					if (orderCreated) {
						const cancelled = await orders.orders.cancelOrder(orderId, 'Checkout failed');
						if (!cancelled.ok) console.error('[checkout] order cancel failed', cancelled.error);
					}
					const released = await catalog.inventory.release(stockLines, reference);
					if (!released.ok) console.error('[checkout] stock release failed', released.error);
					throw cause;
				}

				const manual = input.paymentMode === 'qris';
				let placed: PlacedOrder;
				try {
					placed = unwrap(
						await orders.orders.createOrder({
							orderId,
							userId: buyer.id,
							status: manual ? 'pending' : 'paid',
							paymentStatus: manual ? 'pending' : 'paid',
							subtotal,
							discount,
							shipping,
							tax: 0,
							grandTotal,
							currency: current.currency ?? (await settings.getCurrency()),
							couponId,
							shippingAddress: destination,
							billingAddress: destination,
							notes: input.note ?? null,
							items: lines,
							payment: manual
								? { provider: 'qris', status: 'pending' }
								: { provider: 'mock', status: 'succeeded' }
						})
					);
				} catch (error) {
					return await undo(error, false);
				}

				if (couponId) {
					try {
						unwrap(
							await marketing.marketing.redeemCoupon({
								couponId,
								orderId,
								userId: buyer.id,
								amount: discount
							})
						);
					} catch (error) {
						return await undo(error, true);
					}
				}

				unwrap(await cart.cart.markConverted(cartId));
				return ok(placed);
			} catch (error) {
				return err(toAppError(error));
			}
		}
	};
}
