import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { getCart, markCartConverted, type Cart } from '#lib/server/modules/cart/cart.ts';
import { CatalogError } from '#lib/server/modules/catalog/errors.ts';
import { getSiteSettings } from '#lib/server/modules/storefront/site.ts';
import type { CheckoutInput } from '#lib/server/modules/customer/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

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
			throw new CatalogError(409, 'A product in your cart is no longer available');
		}

		if (variant.stock < item.quantity) {
			throw new CatalogError(409, `Insufficient stock for ${variant.productName}`);
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

function addressSnapshot(address: Record<string, unknown>): Record<string, unknown> {
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

function generateOrderNumber() {
	return `SX-${Date.now().toString(36).toUpperCase()}-${Math.random()
		.toString(36)
		.slice(2, 6)
		.toUpperCase()}`;
}

export async function placeOrder(userId: string, cartId: string, input: CheckoutInput) {
	const cart = await getCart(cartId);

	if (!cart || cart.items.length === 0) {
		throw new CatalogError(409, 'Your cart is empty');
	}

	const [address] = await queryDb
		.select()
		.from(t.addresses)
		.where(and(eq(t.addresses.id, input.addressId), eq(t.addresses.userId, userId)))
		.limit(1);

	if (!address) {
		throw new CatalogError(404, 'Address not found');
	}

	const settings = await getSiteSettings();
	const shipping = settings.shipping.find((method) => method.id === input.shippingId);

	if (!shipping) {
		throw new CatalogError(422, 'Unknown shipping method');
	}

	const variantIds: string[] = Array.from(new Set(cart.items.map((item) => item.variantId)));

	const variantRows: VariantRow[] = await queryDb
		.select({
			id: t.productVariants.id,
			productId: t.productVariants.productId,
			sku: t.productVariants.sku,
			priceCents: t.productVariants.priceCents,
			stock: t.productVariants.stock,
			productName: t.products.name
		})
		.from(t.productVariants)
		.innerJoin(t.products, eq(t.productVariants.productId, t.products.id))
		.where(inArray(t.productVariants.id, variantIds));

	const variantById = new Map<string, VariantRow>(
		variantRows.map((variant) => [variant.id, variant])
	);

	const productIds = Array.from(new Set(variantRows.map((variant) => variant.productId)));
	const imageRows: Array<{ productId: string; url: string; position: number }> = productIds.length
		? await queryDb
				.select({
					productId: t.productImages.productId,
					url: t.productImages.url,
					position: t.productImages.position
				})
				.from(t.productImages)
				.where(inArray(t.productImages.productId, productIds))
				.orderBy(asc(t.productImages.position), asc(t.productImages.id))
		: [];

	const imageByProduct = new Map<string, string>();
	for (const image of imageRows) {
		if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image.url);
	}

	const now = new Date();
	const { items, subtotalCents } = resolveItems(cart, variantById, imageByProduct, now);

	const discountCents = Math.max(0, Math.min(cart.discountCents, subtotalCents));

	const shippingCents = shipping.priceCents;
	const taxCents = 0;
	const grandTotalCents = subtotalCents - discountCents + shippingCents;

	let couponRecord: { id: string } | null = null;
	if (discountCents > 0 && cart.coupon) {
		const [row] = await queryDb
			.select({ id: t.coupons.id })
			.from(t.coupons)
			.where(eq(t.coupons.code, cart.coupon.code))
			.limit(1);
		couponRecord = row ?? null;
	}

	const couponId = couponRecord?.id ?? null;
	const orderId = crypto.randomUUID();
	const orderNumber = generateOrderNumber();
	const shippingAddress = addressSnapshot(address);
	const billingAddress = addressSnapshot(address);

	await queryDb.transaction(async (tx: any) => {
		await tx.insert(t.orders).values({
			id: orderId,
			orderNumber,
			userId,
			status: 'paid',
			paymentStatus: 'paid',
			fulfillmentStatus: 'unfulfilled',
			subtotalCents,
			discountCents,
			shippingCents,
			taxCents,
			grandTotalCents,
			currency: cart.currency ?? settings.currency,
			couponId,
			shippingAddressJson: shippingAddress,
			billingAddressJson: billingAddress,
			placedAt: now,
			notes: input.note ?? null,
			createdAt: now,
			updatedAt: now
		});

		await tx.insert(t.orderItems).values(items.map((item) => ({ ...item, orderId })));

		await tx.insert(t.orderEvents).values({
			id: crypto.randomUUID(),
			orderId,
			type: 'placed',
			message: 'Order placed',
			actorUserId: userId,
			createdAt: now
		});

		await tx.insert(t.payments).values({
			id: crypto.randomUUID(),
			orderId,
			provider: 'mock',
			providerRef: null,
			amountCents: grandTotalCents,
			status: 'succeeded',
			paidAt: now,
			failureReason: null,
			createdAt: now,
			updatedAt: now
		});

		for (const item of items) {
			await tx
				.update(t.productVariants)
				.set({
					stock: sql`${t.productVariants.stock} - ${item.quantity}`,
					updatedAt: now
				})
				.where(eq(t.productVariants.id, item.variantId));

			await tx.insert(t.inventoryMovements).values({
				id: crypto.randomUUID(),
				variantId: item.variantId,
				delta: -item.quantity,
				reason: 'order',
				referenceType: 'order',
				referenceId: orderId,
				adminUserId: null,
				createdAt: now
			});
		}

		if (couponId) {
			await tx
				.update(t.coupons)
				.set({
					usedCount: sql`${t.coupons.usedCount} + 1`,
					updatedAt: now
				})
				.where(eq(t.coupons.id, couponId));

			await tx.insert(t.couponRedemptions).values({
				id: crypto.randomUUID(),
				couponId,
				orderId,
				userId,
				amountCents: discountCents,
				createdAt: now
			});
		}
	});

	await markCartConverted(cartId);

	return { orderId, orderNumber };
}
