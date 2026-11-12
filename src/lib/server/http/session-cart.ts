import type { Cookies } from '@sveltejs/kit';
import { unwrap } from '#shared';
import { getRuntime } from '#lib/server/runtime.server.ts';

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

/** Finds, creates or merges the visitor's cart and refreshes the cart cookie. */
export async function resolveCartId(cookies: Cookies, userId: string | null): Promise<string> {
	const resolved = unwrap(
		await getRuntime().services.cart.cart.resolveCart({
			userId,
			cookieCartId: cookies.get(CART_COOKIE) ?? null
		})
	);

	attachCartCookie(cookies, resolved);
	return resolved;
}
