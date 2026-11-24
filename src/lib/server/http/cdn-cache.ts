import type { RequestEvent } from '@sveltejs/kit';
import { NETLIFY_PURGE_API_TOKEN, SITE_ID } from '$app/env/private';

/** Every CDN-cached public response carries this tag so one purge refreshes the whole shop. */
export const STOREFRONT_CACHE_TAG = 'storefront';

/**
 * Browsers revalidate quickly; Netlify's CDN keeps the response for `seconds` and serves it stale
 * while it refetches in the background, so most visitors never invoke a function.
 */
export function storefrontCacheHeaders(seconds: number): Record<string, string> {
	return {
		'cache-control': 'public, max-age=60, must-revalidate',
		'netlify-cdn-cache-control': `public, durable, s-maxage=${seconds}, stale-while-revalidate=86400`,
		'netlify-cache-tag': STOREFRONT_CACHE_TAG
	};
}

/** Public catalog reads that look the same for every visitor (no session is read for them). */
export function isStorefrontRead(event: RequestEvent): boolean {
	return event.request.method === 'GET' && event.url.pathname.startsWith('/api/storefront/');
}

/** Admin writes change what the shop shows (products, stock, banners, settings, ...). */
export function isAdminWrite(event: RequestEvent): boolean {
	const { method } = event.request;
	return method !== 'GET' && method !== 'HEAD' && event.url.pathname.startsWith('/api/admin/');
}

/** Drops cached storefront responses; a no-op outside Netlify, where the token is not injected. */
export async function purgeStorefrontCache(): Promise<void> {
	if (!NETLIFY_PURGE_API_TOKEN || !SITE_ID) return;

	try {
		const response = await fetch('https://api.netlify.com/api/v1/purge', {
			method: 'POST',
			headers: {
				authorization: `Bearer ${NETLIFY_PURGE_API_TOKEN}`,
				'content-type': 'application/json'
			},
			body: JSON.stringify({ site_id: SITE_ID, cache_tags: [STOREFRONT_CACHE_TAG] })
		});
		if (!response.ok) console.error('[cdn-cache] purge failed', response.status);
	} catch (cause) {
		console.error('[cdn-cache] purge failed', cause);
	}
}
