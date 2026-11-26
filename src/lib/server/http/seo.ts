import type { RequestEvent } from '@sveltejs/kit';
import { BETTER_AUTH_URL } from '$app/env/private';
import {
	FALLBACK_META,
	SITE_NAME,
	categoryMeta,
	metaForRoute,
	productMeta,
	renderMetaTags,
	type PageMeta
} from '#lib/frontend/modules/seo/index.ts';

import { m } from '#lib/paraglide/messages.js';

const NOT_FOUND_META: PageMeta = {
	get title() {
		return `${m.storefront_seo_not_found_title()} | ${SITE_NAME}`;
	},
	get description() {
		return FALLBACK_META.description;
	},
	noindex: true
};

/** The public origin used for canonical and Open Graph URLs (the prerender origin is fake). */
export function siteOrigin(event: RequestEvent): string {
	try {
		return new URL(BETTER_AUTH_URL).origin;
	} catch {
		return event.url.origin;
	}
}

async function dynamicMeta(event: RequestEvent): Promise<PageMeta | null> {
	const slug = event.params.slug;
	if (!slug) return null;
	const browse = event.locals.services.catalog.browse;

	if (event.route.id === '/products/[slug]') {
		const result = await browse.getProduct(slug);
		return result.ok && result.value ? productMeta(result.value) : null;
	}

	if (event.route.id === '/categories/[slug]') {
		const result = await browse.listCategories();
		const category = result.ok ? result.value.find((item) => item.slug === slug) : undefined;
		return category ? categoryMeta(category) : null;
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
	const meta = dynamic
		? ((await dynamicMeta(event).catch(() => null)) ?? NOT_FOUND_META)
		: metaForRoute(event.route.id);
	const origin = siteOrigin(event);

	return {
		head: renderMetaTags(meta, `${origin}${event.url.pathname}`, origin),
		cacheable: dynamic && meta !== NOT_FOUND_META
	};
}
