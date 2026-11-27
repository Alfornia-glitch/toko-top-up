import type { RequestEvent } from '@sveltejs/kit';
import { BETTER_AUTH_URL } from '$app/env/private';
import {
	DEFAULT_SITE_NAME,
	categoryMeta,
	fallbackMeta,
	metaForRoute,
	productMeta,
	renderMetaTags,
	type PageMeta
} from '#lib/frontend/modules/seo/index.ts';

import { m } from '#lib/paraglide/messages.js';

function notFoundMeta(siteName: string): PageMeta {
	return {
		get title() {
			return `${m.storefront_seo_not_found_title()} | ${siteName}`;
		},
		get description() {
			return fallbackMeta(siteName).description;
		},
		noindex: true
	};
}

/** The store name from settings; falls back to the built-in name when the lookup fails. */
async function siteNameFor(event: RequestEvent): Promise<string> {
	try {
		const result = await event.locals.services.storefront.storefront.getSiteSettings();
		return result.ok ? result.value.storeName : DEFAULT_SITE_NAME;
	} catch {
		return DEFAULT_SITE_NAME;
	}
}

/** The public origin used for canonical and Open Graph URLs (the prerender origin is fake). */
export function siteOrigin(event: RequestEvent): string {
	try {
		return new URL(BETTER_AUTH_URL).origin;
	} catch {
		return event.url.origin;
	}
}

async function dynamicMeta(event: RequestEvent, siteName: string): Promise<PageMeta | null> {
	const slug = event.params.slug;
	if (!slug) return null;
	const browse = event.locals.services.catalog.browse;

	if (event.route.id === '/products/[slug]') {
		const result = await browse.getProduct(slug);
		return result.ok && result.value ? productMeta(result.value, siteName) : null;
	}

	if (event.route.id === '/categories/[slug]') {
		const result = await browse.listCategories();
		const category = result.ok ? result.value.find((item) => item.slug === slug) : undefined;
		return category ? categoryMeta(category, siteName) : null;
	}

	return null;
}

export interface PageSeo {
	/** HTML for the end of `<head>`. */
	head: string;
	/** Whether the shell may be cached on the CDN (true only for product and category pages). */
	cacheable: boolean;
}

export async function resolvePageSeo(event: RequestEvent): Promise<PageSeo> {
	const dynamic = event.route.id === '/products/[slug]' || event.route.id === '/categories/[slug]';
	const siteName = await siteNameFor(event);
	const notFound = notFoundMeta(siteName);
	const meta = dynamic
		? ((await dynamicMeta(event, siteName).catch(() => null)) ?? notFound)
		: metaForRoute(event.route.id, siteName);
	const origin = siteOrigin(event);

	return {
		head: renderMetaTags(meta, `${origin}${event.url.pathname}`, origin, siteName),
		cacheable: dynamic && meta !== notFound
	};
}
