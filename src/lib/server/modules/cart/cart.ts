import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from '#lib/server/modules/catalog/errors.ts';

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

type CartItemRow = {
	id: string;
	variantId: string;
	quantity: number;
	unitPriceCents: number;
	productId: string;
	productSlug: string;
	productName: string;
	productCurrency: string;
	variantName: string;
	compareAtPriceCents: number | null;
	stock: number;
	brandName: string | null;
};

type CouponRow = {
	code: string;
	type: 'percentage' | 'fixed';
	value: number;
	minSubtotalCents: number;
	maxUses: number | null;
	usedCount: number;
	startsAt: Date | number | null;
	endsAt: Date | number | null;
	status: 'active' | 'disabled';
};

function toTime(value: Date | number | null): number | null {
	if (value === null) return null;
	return value instanceof Date ? value.getTime() : value;
}

export function discountFor(
	coupon: { type: 'percentage' | 'fixed'; value: number },
	subtotal: number
): number {
	if (coupon.type === 'percentage') return Math.round((subtotal * coupon.value) / 100);
	return Math.min(coupon.value, subtotal);
}

function couponIsApplicable(coupon: CouponRow, subtotal: number): boolean {
	const now = Date.now();
	if (coupon.status !== 'active') return false;
	const startsAt = toTime(coupon.startsAt);
	const endsAt = toTime(coupon.endsAt);
	if (startsAt !== null && now < startsAt) return false;
	if (endsAt !== null && now > endsAt) return false;
	if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return false;
	if (subtotal < (coupon.minSubtotalCents ?? 0)) return false;
	return true;
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

async function touchCart(cartId: string) {
	await queryDb.update(t.carts).set({ updatedAt: new Date() }).where(eq(t.carts.id, cartId));
}

export async function getCart(cartId: string): Promise<Cart> {
	const [cart] = await queryDb.select().from(t.carts).where(eq(t.carts.id, cartId)).limit(1);
	if (!cart) return emptyCart(cartId);

	const rows: CartItemRow[] = await queryDb
		.select({
			id: t.cartItems.id,
			variantId: t.cartItems.variantId,
			quantity: t.cartItems.quantity,
			unitPriceCents: t.cartItems.unitPriceCents,
			productId: t.products.id,
			productSlug: t.products.slug,
			productName: t.products.name,
			productCurrency: t.products.currency,
			variantName: t.productVariants.name,
			compareAtPriceCents: t.productVariants.compareAtPriceCents,
			stock: t.productVariants.stock,
			brandName: t.brands.name
		})
		.from(t.cartItems)
		.innerJoin(t.productVariants, eq(t.cartItems.variantId, t.productVariants.id))
		.innerJoin(t.products, eq(t.productVariants.productId, t.products.id))
		.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
		.where(eq(t.cartItems.cartId, cartId))
		.orderBy(asc(t.cartItems.createdAt));

	const productIds = [...new Set(rows.map((row) => row.productId as string))];
	const imageByProduct = new Map<string, string>();
	if (productIds.length > 0) {
		const images = await queryDb
			.select({
				productId: t.productImages.productId,
				url: t.productImages.url,
				position: t.productImages.position
			})
			.from(t.productImages)
			.where(inArray(t.productImages.productId, productIds))
			.orderBy(asc(t.productImages.position));
		for (const image of images) {
			if (!imageByProduct.has(image.productId)) {
				imageByProduct.set(image.productId, image.url);
			}
		}
	}

	const items: CartItem[] = rows.map((row) => ({
		id: row.id,
		variantId: row.variantId,
		productId: row.productId,
		productSlug: row.productSlug,
		productName: row.productName,
		variantName: row.variantName,
		brandName: row.brandName ?? null,
		imageUrl: imageByProduct.get(row.productId) ?? null,
		unitPriceCents: row.unitPriceCents,
		compareAtPriceCents: row.compareAtPriceCents ?? null,
		quantity: row.quantity,
		stock: row.stock
	}));

	const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
	const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

	let coupon: CartCoupon | null = null;
	let discountCents = 0;
	if (cart.couponId) {
		const [couponRow] = await queryDb
			.select()
			.from(t.coupons)
			.where(eq(t.coupons.id, cart.couponId))
			.limit(1);
		if (couponRow) {
			coupon = { code: couponRow.code, type: couponRow.type, value: couponRow.value };
			if (couponIsApplicable(couponRow as CouponRow, subtotalCents)) {
				discountCents = discountFor(couponRow as CouponRow, subtotalCents);
			}
		}
	}

	const shippingCents = 0;
	const totalCents = subtotalCents - discountCents;
	const currency = rows[0]?.productCurrency ?? cart.currency ?? 'USD';

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

	for (const item of guestItems) {
		const [variant] = await queryDb
			.select({ stock: t.productVariants.stock })
			.from(t.productVariants)
			.where(eq(t.productVariants.id, item.variantId))
			.limit(1);
		const stock = variant?.stock ?? 0;

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
	const [variant] = await queryDb
		.select()
		.from(t.productVariants)
		.where(eq(t.productVariants.id, input.variantId))
		.limit(1);

	if (!variant) throw new CatalogError(404, 'Variant not found');
	if (variant.status !== 'active') throw new CatalogError(422, 'Variant is not available');

	const [existing] = await queryDb
		.select()
		.from(t.cartItems)
		.where(and(eq(t.cartItems.cartId, cartId), eq(t.cartItems.variantId, input.variantId)))
		.limit(1);

	if (existing) {
		const quantity = existing.quantity + input.quantity;
		if (quantity > variant.stock) throw new CatalogError(422, 'Insufficient stock');
		await queryDb
			.update(t.cartItems)
			.set({ quantity, updatedAt: new Date() })
			.where(eq(t.cartItems.id, existing.id));
	} else {
		if (input.quantity > variant.stock) throw new CatalogError(422, 'Insufficient stock');
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

	if (!item) throw new CatalogError(404, 'Cart item not found');

	if (quantity <= 0) {
		await queryDb.delete(t.cartItems).where(eq(t.cartItems.id, itemId));
	} else {
		const [variant] = await queryDb
			.select({ stock: t.productVariants.stock })
			.from(t.productVariants)
			.where(eq(t.productVariants.id, item.variantId))
			.limit(1);
		if (!variant) throw new CatalogError(404, 'Variant not found');
		if (quantity > variant.stock) throw new CatalogError(422, 'Insufficient stock');
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
	const normalized = code.trim().toUpperCase();
	const [coupon] = await queryDb
		.select()
		.from(t.coupons)
		.where(eq(t.coupons.code, normalized))
		.limit(1);

	if (!coupon) throw new CatalogError(404, 'Coupon not found');
	if (coupon.status !== 'active') throw new CatalogError(422, 'Coupon is not active');

	const now = Date.now();
	const startsAt = toTime(coupon.startsAt);
	const endsAt = toTime(coupon.endsAt);
	if (startsAt !== null && now < startsAt) throw new CatalogError(422, 'Coupon is not yet active');
	if (endsAt !== null && now > endsAt) throw new CatalogError(422, 'Coupon has expired');
	if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
		throw new CatalogError(422, 'Coupon usage limit reached');

	const current = await getCart(cartId);
	if (current.subtotalCents < (coupon.minSubtotalCents ?? 0))
		throw new CatalogError(422, 'Cart subtotal is below the coupon minimum');

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
