import type { Cart } from '#modules/cart/index.ts';
import { getSiteSettings } from '#lib/server/modules/storefront/site.ts';
import type { CheckoutInput } from '#lib/server/modules/customer/validation.ts';
import type { Address } from '#modules/customers/index.ts';
import { ConflictError, UnprocessableError, unwrap, type Actor } from '#shared';
import { getRuntime } from '#lib/server/runtime.server.ts';

interface VariantRow {
	id: string;
	productId: string;
	sku: string;
	priceCents: number;
	stock: number;
	productName: string;
}

interface ResolvedItem {
	id: string;
	productId: string;
	variantId: string;
	productNameSnapshot: string;
	skuSnapshot: string;
	imageUrlSnapshot: string | null;
	quantity: number;
	unitPriceCents: number;
	totalCents: number;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

function resolveItems(
	cart: Cart,
	variantById: Map<string, VariantRow>,
	imageByProduct: Map<string, string>,
	now: Date
) {
	const items: ResolvedItem[] = [];
	let subtotalCents = 0;

	for (const item of cart.items) {
		const variant = variantById.get(item.variantId);

		if (!variant) {
			throw new ConflictError('A product in your cart is no longer available');
		}

		if (variant.stock < item.quantity) {
			throw new ConflictError(`Insufficient stock for ${variant.productName}`);
		}

		const totalCents = variant.priceCents * item.quantity;
		subtotalCents += totalCents;

		items.push({
			id: crypto.randomUUID(),
			productId: variant.productId,
			variantId: variant.id,
			productNameSnapshot: variant.productName,
			skuSnapshot: variant.sku,
			imageUrlSnapshot: imageByProduct.get(variant.productId) ?? null,
			quantity: item.quantity,
			unitPriceCents: variant.priceCents,
			totalCents,
			status: 'pending',
			createdAt: now,
			updatedAt: now
		});
	}

	return { items, subtotalCents };
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

export async function placeOrder(actor: Actor, cartId: string, input: CheckoutInput) {
	const userId = actor.id;
	const cart = unwrap(await getRuntime().services.cart.cart.getCart(cartId));

	if (!cart || cart.items.length === 0) {
		throw new ConflictError('Your cart is empty');
	}

	const address = unwrap(
		await getRuntime().services.customers.customers.getAddress(input.addressId, actor)
	);

	const settings = await getSiteSettings();
	const shipping = settings.shipping.find((method) => method.id === input.shippingId);

	if (!shipping) {
		throw new UnprocessableError('Unknown shipping method');
	}

	const variantIds: string[] = Array.from(new Set(cart.items.map((item) => item.variantId)));

	const snapshots = unwrap(
		await getRuntime().services.catalog.products.getVariantSnapshots(variantIds)
	);

	const variantById = new Map<string, VariantRow>(
		snapshots.map((snapshot) => [
			snapshot.variantId,
			{
				id: snapshot.variantId,
				productId: snapshot.productId,
				sku: snapshot.sku,
				priceCents: snapshot.priceCents,
				stock: snapshot.stock,
				productName: snapshot.productName
			}
		])
	);

	const imageByProduct = new Map<string, string>();
	for (const snapshot of snapshots) {
		if (snapshot.imageUrl) imageByProduct.set(snapshot.productId, snapshot.imageUrl);
	}

	const now = new Date();
	const { items, subtotalCents } = resolveItems(cart, variantById, imageByProduct, now);

	const discountCents = Math.max(0, Math.min(cart.discountCents, subtotalCents));

	const shippingCents = shipping.priceCents;
	const taxCents = 0;
	const grandTotalCents = subtotalCents - discountCents + shippingCents;

	let couponRecord: { id: string } | null = null;
	if (discountCents > 0 && cart.coupon) {
		const coupon = unwrap(
			await getRuntime().services.marketing.marketing.getCouponByCode(cart.coupon.code)
		);
		couponRecord = coupon ? { id: coupon.id } : null;
	}

	const couponId = couponRecord?.id ?? null;
	const orderId = crypto.randomUUID();
	const shippingAddress = addressSnapshot(address);
	const billingAddress = addressSnapshot(address);

	const catalog = getRuntime().services.catalog;
	const stockLines = items.map((item) => ({ variantId: item.variantId, quantity: item.quantity }));
	const reference = { type: 'order', id: orderId };

	// Saga: reserve stock first (guarded, so it cannot oversell), then create the
	// order, then redeem the coupon; each failure undoes the earlier steps. The
	// checkout module takes this over.
	unwrap(await catalog.inventory.reserve(stockLines, reference));

	const { orders, marketing } = getRuntime().services;

	async function compensate(cause: unknown, orderCreated: boolean): Promise<never> {
		if (orderCreated) {
			const cancelled = await orders.orders.cancelOrder(orderId, 'Checkout failed');
			if (!cancelled.ok) console.error('[checkout] order cancel failed', cancelled.error);
		}
		const released = await catalog.inventory.release(stockLines, reference);
		if (!released.ok) console.error('[checkout] stock release failed', released.error);
		throw cause;
	}

	let created;
	try {
		created = unwrap(
			await orders.orders.createOrder({
				orderId,
				userId,
				status: 'paid',
				paymentStatus: 'paid',
				subtotalCents,
				discountCents,
				shippingCents,
				taxCents,
				grandTotalCents,
				currency: cart.currency ?? settings.currency,
				couponId,
				shippingAddress,
				billingAddress,
				notes: input.note ?? null,
				items: items.map((item) => ({
					productId: item.productId,
					variantId: item.variantId,
					productNameSnapshot: item.productNameSnapshot,
					skuSnapshot: item.skuSnapshot,
					imageUrlSnapshot: item.imageUrlSnapshot,
					quantity: item.quantity,
					unitPriceCents: item.unitPriceCents,
					totalCents: item.totalCents
				})),
				payment: { provider: 'mock', status: 'succeeded' }
			})
		);
	} catch (error) {
		return compensate(error, false);
	}

	if (couponId) {
		try {
			unwrap(
				await marketing.marketing.redeemCoupon({
					couponId,
					orderId,
					userId,
					amountCents: discountCents
				})
			);
		} catch (error) {
			return compensate(error, true);
		}
	}

	unwrap(await getRuntime().services.cart.cart.markConverted(cartId));

	return { orderId: created.orderId, orderNumber: created.orderNumber };
}
