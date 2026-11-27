import {
	NotFoundError,
	UnprocessableError,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	unwrap,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import type { CatalogServices } from '#modules/catalog/server.ts';
import { discountFor, isCouponApplicable } from '#modules/marketing/index.ts';
import type { MarketingServices } from '#modules/marketing/server.ts';
import {
	emptyCart,
	type Cart,
	type CartCoupon,
	type CartItem,
	type CartItemRecord,
	type CartRepository,
	type MergePlan
} from '../domain/cart.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface CartService {
	/**
	 * Finds or creates the cart for a visitor. Signed-in users get their active
	 * cart (a guest cart from the cookie is merged into it); guests reuse their
	 * cookie cart while it is still an active guest cart.
	 */
	resolveCart(visitor: { userId: string | null; cookieCartId: string | null }): Outcome<string>;
	getCart(cartId: string): Outcome<Cart>;
	addItem(cartId: string, input: { variantId: string; quantity: number }): Outcome<Cart>;
	updateItem(cartId: string, itemId: string, quantity: number): Outcome<Cart>;
	removeItem(cartId: string, itemId: string): Outcome<Cart>;
	clearCart(cartId: string): Outcome<Cart>;
	applyCoupon(cartId: string, code: string): Outcome<Cart>;
	removeCoupon(cartId: string): Outcome<Cart>;
	markConverted(cartId: string): Outcome<void>;
}

export interface CartDependencies {
	catalog: Pick<CatalogServices, 'products'>;
	marketing: Pick<MarketingServices, 'marketing'>;
}

export function createCartService(
	repository: CartRepository,
	dependencies: CartDependencies,
	clock: Clock = systemClock
): CartService {
	const { catalog, marketing } = dependencies;

	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	async function snapshots(variantIds: string[]) {
		const rows = unwrap(await catalog.products.getVariantSnapshots(variantIds));
		return new Map(rows.map((row) => [row.variantId, row]));
	}

	async function touch(cartId: string): Promise<void> {
		await repository.updateCart(cartId, { updatedAt: clock.now() });
	}

	async function view(cartId: string): Promise<Cart> {
		const cart = await repository.findCart(cartId);
		if (!cart) return emptyCart(cartId);

		const records = await repository.listItems(cartId);
		const variants = await snapshots(records.map((record) => record.variantId));

		// Items whose variant no longer exists are dropped from the view.
		const items: CartItem[] = records.flatMap((record) => {
			const variant = variants.get(record.variantId);
			if (!variant) return [];
			return [
				{
					id: record.id,
					variantId: record.variantId,
					productId: variant.productId,
					productSlug: variant.productSlug,
					productName: variant.productName,
					variantName: variant.name,
					brandName: variant.brandName,
					imageUrl: variant.imageUrl,
					unitPrice: record.unitPrice,
					compareAtPrice: variant.compareAtPrice,
					quantity: record.quantity,
					stock: variant.stock
				}
			];
		});

		const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
		const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

		let coupon: CartCoupon | null = null;
		let discount = 0;
		if (cart.couponId) {
			const row = unwrap(await marketing.marketing.getCouponById(cart.couponId));
			if (row) {
				coupon = { code: row.code, type: row.type, value: row.value };
				if (isCouponApplicable(row, subtotal, clock.now().getTime())) {
					discount = discountFor(row, subtotal);
				}
			}
		}

		const firstRecord = records[0];
		const currency =
			(firstRecord ? variants.get(firstRecord.variantId)?.productCurrency : undefined) ??
			cart.currency ??
			'IDR';

		return {
			id: cartId,
			items,
			subtotal,
			discount,
			shipping: 0,
			total: subtotal - discount,
			currency,
			itemCount,
			coupon
		};
	}

	async function createCart(userId: string | null): Promise<string> {
		const id = newId();
		const now = clock.now();
		await repository.insertCart({
			id,
			userId,
			status: 'active',
			currency: 'IDR',
			couponId: null,
			createdAt: now,
			updatedAt: now
		});
		return id;
	}

	async function isActiveGuestCart(cartId: string): Promise<boolean> {
		const cart = await repository.findCart(cartId);
		return Boolean(cart && cart.status === 'active' && cart.userId === null);
	}

	async function mergeGuestCart(guestCartId: string, userId: string): Promise<string> {
		const userCartId = (await repository.findActiveCartId(userId)) ?? (await createCart(userId));
		if (guestCartId === userCartId) return userCartId;

		const guestItems = await repository.listItems(guestCartId);
		const variants = await snapshots(guestItems.map((item) => item.variantId));
		const now = clock.now();
		const plan: MergePlan = {
			guestCartId,
			userCartId,
			inserts: [],
			updates: [],
			deletes: [],
			now
		};

		for (const item of guestItems) {
			const stock = variants.get(item.variantId)?.stock ?? 0;
			const existing = await repository.findItemByVariant(userCartId, item.variantId);

			if (existing) {
				const quantity = Math.min(existing.quantity + item.quantity, stock);
				if (quantity > 0) plan.updates.push({ id: existing.id, quantity });
				else plan.deletes.push(existing.id);
			} else if (stock > 0) {
				plan.inserts.push({
					id: newId(),
					cartId: userCartId,
					variantId: item.variantId,
					quantity: Math.min(item.quantity, stock),
					unitPrice: item.unitPrice,
					createdAt: now,
					updatedAt: now
				});
			}
		}

		await repository.applyMerge(plan);
		return userCartId;
	}

	return {
		resolveCart: ({ userId, cookieCartId }) =>
			run(async () => {
				if (userId) {
					const userCartId = await repository.findActiveCartId(userId);
					const canMerge =
						cookieCartId !== null &&
						cookieCartId !== userCartId &&
						(await isActiveGuestCart(cookieCartId));

					if (canMerge && cookieCartId) return mergeGuestCart(cookieCartId, userId);
					return userCartId ?? (await createCart(userId));
				}

				const canReuse = cookieCartId !== null && (await isActiveGuestCart(cookieCartId));
				return canReuse && cookieCartId ? cookieCartId : await createCart(null);
			}),

		getCart: (cartId) => run(() => view(cartId)),

		addItem: (cartId, input) =>
			run(async () => {
				const variant = (await snapshots([input.variantId])).get(input.variantId);
				if (!variant)
					throw new NotFoundError('Variant not found', { messageKey: 'variant_not_found' });
				if (variant.status !== 'active')
					throw new UnprocessableError('Variant is not available', {
						messageKey: 'variant_unavailable'
					});

				const existing = await repository.findItemByVariant(cartId, input.variantId);
				const now = clock.now();

				if (existing) {
					const quantity = existing.quantity + input.quantity;
					if (quantity > variant.stock)
						throw new UnprocessableError('Insufficient stock', {
							messageKey: 'insufficient_stock'
						});
					await repository.updateItem(existing.id, { quantity, updatedAt: now });
				} else {
					if (input.quantity > variant.stock)
						throw new UnprocessableError('Insufficient stock', {
							messageKey: 'insufficient_stock'
						});
					const item: CartItemRecord = {
						id: newId(),
						cartId,
						variantId: input.variantId,
						quantity: input.quantity,
						unitPrice: variant.price,
						createdAt: now,
						updatedAt: now
					};
					await repository.insertItem(item);
				}

				await touch(cartId);
				return view(cartId);
			}),

		updateItem: (cartId, itemId, quantity) =>
			run(async () => {
				const item = await repository.findItem(cartId, itemId);
				if (!item)
					throw new NotFoundError('Cart item not found', { messageKey: 'cart_item_not_found' });

				if (quantity <= 0) {
					await repository.deleteItem(cartId, itemId);
				} else {
					const variant = (await snapshots([item.variantId])).get(item.variantId);
					if (!variant)
						throw new NotFoundError('Variant not found', { messageKey: 'variant_not_found' });
					if (quantity > variant.stock)
						throw new UnprocessableError('Insufficient stock', {
							messageKey: 'insufficient_stock'
						});
					await repository.updateItem(itemId, { quantity, updatedAt: clock.now() });
				}

				await touch(cartId);
				return view(cartId);
			}),

		removeItem: (cartId, itemId) =>
			run(async () => {
				await repository.deleteItem(cartId, itemId);
				await touch(cartId);
				return view(cartId);
			}),

		clearCart: (cartId) =>
			run(async () => {
				await repository.deleteItems(cartId);
				await touch(cartId);
				return view(cartId);
			}),

		applyCoupon: (cartId, code) =>
			run(async () => {
				const current = await view(cartId);
				const coupon = unwrap(
					await marketing.marketing.validateCouponForCart(code, current.subtotal)
				);
				await repository.updateCart(cartId, { couponId: coupon.id, updatedAt: clock.now() });
				return view(cartId);
			}),

		removeCoupon: (cartId) =>
			run(async () => {
				await repository.updateCart(cartId, { couponId: null, updatedAt: clock.now() });
				return view(cartId);
			}),

		markConverted: (cartId) =>
			run(async () => {
				await repository.updateCart(cartId, { status: 'converted', updatedAt: clock.now() });
			})
	};
}
