import { and, asc, desc, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { NotFoundError, UnprocessableError, unwrap } from '#shared';
import { discountFor, isCouponApplicable } from '#modules/marketing/index.ts';
import { getRuntime } from '#lib/server/runtime.server.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export interface CartItem {
	id: string;
	variantId: string;
	productId: string;
	productSlug: string;
	productName: string;
	variantName: string;
	brandName: string | null;
	imageUrl: string | null;
	unitPriceCents: number;
	compareAtPriceCents: number | null;
	quantity: number;
	stock: number;
}

export interface CartCoupon {
	code: string;
	type: 'percentage' | 'fixed';
	value: number;
}

export interface Cart {
	id: string;
	items: CartItem[];
	subtotalCents: number;
	discountCents: number;
	shippingCents: number;
	totalCents: number;
	currency: string;
	itemCount: number;
	coupon: CartCoupon | null;
}

function emptyCart(cartId: string, currency = 'USD'): Cart {
	return {
		id: cartId,
		items: [],
		subtotalCents: 0,
		discountCents: 0,
		shippingCents: 0,
		totalCents: 0,
		currency,
		itemCount: 0,
		coupon: null
	};
}

async function variantSnapshots(variantIds: string[]) {
	const snapshots = unwrap(
		await getRuntime().services.catalog.products.getVariantSnapshots(variantIds)
	);
	return new Map(snapshots.map((snapshot) => [snapshot.variantId, snapshot]));
}

async function touchCart(cartId: string) {
	await queryDb.update(t.carts).set({ updatedAt: new Date() }).where(eq(t.carts.id, cartId));
}

export async function getCart(cartId: string): Promise<Cart> {
	const [cart] = await queryDb.select().from(t.carts).where(eq(t.carts.id, cartId)).limit(1);
	if (!cart) return emptyCart(cartId);

	const itemRows = await queryDb
		.select({
			id: t.cartItems.id,
			variantId: t.cartItems.variantId,
			quantity: t.cartItems.quantity,
			unitPriceCents: t.cartItems.unitPriceCents
		})
		.from(t.cartItems)
		.where(eq(t.cartItems.cartId, cartId))
		.orderBy(asc(t.cartItems.createdAt));

	const snapshots = await variantSnapshots(
		itemRows.map((row: { variantId: string }) => row.variantId)
	);

	// Items whose variant no longer exists are dropped from the view.
	const items: CartItem[] = itemRows.flatMap(
		(row: { id: string; variantId: string; quantity: number; unitPriceCents: number }) => {
			const variant = snapshots.get(row.variantId);
			if (!variant) return [];
			return [
				{
					id: row.id,
					variantId: row.variantId,
					productId: variant.productId,
					productSlug: variant.productSlug,
					productName: variant.productName,
					variantName: variant.name,
					brandName: variant.brandName,
					imageUrl: variant.imageUrl,
					unitPriceCents: row.unitPriceCents,
					compareAtPriceCents: variant.compareAtPriceCents,
					quantity: row.quantity,
					stock: variant.stock
				}
			];
		}
	);

	const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
	const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

	let coupon: CartCoupon | null = null;
	let discountCents = 0;
	if (cart.couponId) {
		const couponRow = unwrap(
			await getRuntime().services.marketing.marketing.getCouponById(cart.couponId)
		);
		if (couponRow) {
			coupon = { code: couponRow.code, type: couponRow.type, value: couponRow.value };
			if (isCouponApplicable(couponRow, subtotalCents, Date.now())) {
				discountCents = discountFor(couponRow, subtotalCents);
			}
		}
	}

	const shippingCents = 0;
	const totalCents = subtotalCents - discountCents;
	const currency =
		(itemRows[0] ? snapshots.get(itemRows[0].variantId)?.productCurrency : undefined) ??
		cart.currency ??
		'USD';

	return {
		id: cartId,
		items,
		subtotalCents,
		discountCents,
		shippingCents,
		totalCents,
		currency,
		itemCount,
		coupon
	};
}

export async function createCart(userId: string | null): Promise<string> {
	const id = crypto.randomUUID();
	const now = new Date();
	await queryDb.insert(t.carts).values({
		id,
		userId,
		status: 'active',
		currency: 'USD',
		couponId: null,
		createdAt: now,
		updatedAt: now
	});
	return id;
}

export async function findActiveCart(userId: string): Promise<string | null> {
	const [cart] = await queryDb
		.select({ id: t.carts.id })
		.from(t.carts)
		.where(and(eq(t.carts.userId, userId), eq(t.carts.status, 'active')))
		.orderBy(desc(t.carts.updatedAt), desc(t.carts.createdAt))
		.limit(1);
	return cart?.id ?? null;
}

export async function mergeGuestCart(guestCartId: string, userId: string): Promise<string> {
	const userCartId = (await findActiveCart(userId)) ?? (await createCart(userId));
	if (guestCartId === userCartId) return userCartId;

	const guestItems = await queryDb
		.select()
		.from(t.cartItems)
		.where(eq(t.cartItems.cartId, guestCartId));

	const snapshots = await variantSnapshots(guestItems.map((item) => item.variantId as string));

	for (const item of guestItems) {
		const stock = snapshots.get(item.variantId)?.stock ?? 0;

		const [existing] = await queryDb
			.select()
			.from(t.cartItems)
			.where(and(eq(t.cartItems.cartId, userCartId), eq(t.cartItems.variantId, item.variantId)))
			.limit(1);

		if (existing) {
			const quantity = Math.min(existing.quantity + item.quantity, stock);
			if (quantity > 0) {
				await queryDb
					.update(t.cartItems)
					.set({ quantity, updatedAt: new Date() })
					.where(eq(t.cartItems.id, existing.id));
			} else {
				await queryDb.delete(t.cartItems).where(eq(t.cartItems.id, existing.id));
			}
		} else if (stock > 0) {
			const now = new Date();
			await queryDb.insert(t.cartItems).values({
				id: crypto.randomUUID(),
				cartId: userCartId,
				variantId: item.variantId,
				quantity: Math.min(item.quantity, stock),
				unitPriceCents: item.unitPriceCents,
				createdAt: now,
				updatedAt: now
			});
		}
	}

	await queryDb.delete(t.cartItems).where(eq(t.cartItems.cartId, guestCartId));
	await queryDb
		.update(t.carts)
		.set({ status: 'abandoned', updatedAt: new Date() })
		.where(eq(t.carts.id, guestCartId));
	await touchCart(userCartId);

	return userCartId;
}

export async function addItem(
	cartId: string,
	input: { variantId: string; quantity: number }
): Promise<Cart> {
	const variant = (await variantSnapshots([input.variantId])).get(input.variantId);

	if (!variant) throw new NotFoundError('Variant not found');
	if (variant.status !== 'active') throw new UnprocessableError('Variant is not available');

	const [existing] = await queryDb
		.select()
		.from(t.cartItems)
		.where(and(eq(t.cartItems.cartId, cartId), eq(t.cartItems.variantId, input.variantId)))
		.limit(1);

	if (existing) {
		const quantity = existing.quantity + input.quantity;
		if (quantity > variant.stock) throw new UnprocessableError('Insufficient stock');
		await queryDb
			.update(t.cartItems)
			.set({ quantity, updatedAt: new Date() })
			.where(eq(t.cartItems.id, existing.id));
	} else {
		if (input.quantity > variant.stock) throw new UnprocessableError('Insufficient stock');
		const now = new Date();
		await queryDb.insert(t.cartItems).values({
			id: crypto.randomUUID(),
			cartId,
			variantId: input.variantId,
			quantity: input.quantity,
			unitPriceCents: variant.priceCents,
			createdAt: now,
			updatedAt: now
		});
	}

	await touchCart(cartId);
	return getCart(cartId);
}

export async function updateItem(cartId: string, itemId: string, quantity: number): Promise<Cart> {
	const [item] = await queryDb
		.select()
		.from(t.cartItems)
		.where(and(eq(t.cartItems.id, itemId), eq(t.cartItems.cartId, cartId)))
		.limit(1);

	if (!item) throw new NotFoundError('Cart item not found');

	if (quantity <= 0) {
		await queryDb.delete(t.cartItems).where(eq(t.cartItems.id, itemId));
	} else {
		const variant = (await variantSnapshots([item.variantId])).get(item.variantId);
		if (!variant) throw new NotFoundError('Variant not found');
		if (quantity > variant.stock) throw new UnprocessableError('Insufficient stock');
		await queryDb
			.update(t.cartItems)
			.set({ quantity, updatedAt: new Date() })
			.where(eq(t.cartItems.id, itemId));
	}

	await touchCart(cartId);
	return getCart(cartId);
}

export async function removeItem(cartId: string, itemId: string): Promise<Cart> {
	await queryDb
		.delete(t.cartItems)
		.where(and(eq(t.cartItems.id, itemId), eq(t.cartItems.cartId, cartId)));
	await touchCart(cartId);
	return getCart(cartId);
}

export async function applyCoupon(cartId: string, code: string): Promise<Cart> {
	const current = await getCart(cartId);
	const coupon = unwrap(
		await getRuntime().services.marketing.marketing.validateCouponForCart(
			code,
			current.subtotalCents
		)
	);

	await queryDb
		.update(t.carts)
		.set({ couponId: coupon.id, updatedAt: new Date() })
		.where(eq(t.carts.id, cartId));

	return getCart(cartId);
}

export async function removeCoupon(cartId: string): Promise<Cart> {
	await queryDb
		.update(t.carts)
		.set({ couponId: null, updatedAt: new Date() })
		.where(eq(t.carts.id, cartId));
	return getCart(cartId);
}

export async function clearCart(cartId: string): Promise<Cart> {
	await queryDb.delete(t.cartItems).where(eq(t.cartItems.cartId, cartId));
	await touchCart(cartId);
	return getCart(cartId);
}

export async function markCartConverted(cartId: string): Promise<void> {
	await queryDb
		.update(t.carts)
		.set({ status: 'converted', updatedAt: new Date() })
		.where(eq(t.carts.id, cartId));
}
