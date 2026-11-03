import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { createCart, findActiveCart, mergeGuestCart } from './cart.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

const CART_COOKIE = 'cart_id';
const COOKIE_OPTIONS = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	maxAge: 60 * 60 * 24 * 30
};

export function attachCartCookie(cookies: Cookies, cartId: string): void {
	cookies.set(CART_COOKIE, cartId, COOKIE_OPTIONS);
}

async function isActiveGuestCart(cartId: string): Promise<boolean> {
	const [cart] = await queryDb
		.select({ status: t.carts.status, userId: t.carts.userId })
		.from(t.carts)
		.where(eq(t.carts.id, cartId))
		.limit(1);
	return Boolean(cart && cart.status === 'active' && cart.userId === null);
}

export async function resolveCartId(cookies: Cookies, userId: string | null): Promise<string> {
	const cookieCartId = cookies.get(CART_COOKIE) ?? null;

	let resolved: string;

	if (userId) {
		const userCartId = await findActiveCart(userId);
		const canMerge =
			cookieCartId !== null &&
			cookieCartId !== userCartId &&
			(await isActiveGuestCart(cookieCartId));

		if (canMerge && cookieCartId) {
			resolved = await mergeGuestCart(cookieCartId, userId);
		} else {
			resolved = userCartId ?? (await createCart(userId));
		}
	} else {
		const canReuse = cookieCartId !== null && (await isActiveGuestCart(cookieCartId));
		resolved = canReuse && cookieCartId ? cookieCartId : await createCart(null);
	}

	attachCartCookie(cookies, resolved);
	return resolved;
}
