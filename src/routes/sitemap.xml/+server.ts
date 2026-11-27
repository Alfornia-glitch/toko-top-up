import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { DEFAULT_SITE_NAME, staticMetaFor } from '#lib/frontend/modules/seo/index.ts';
import { storefrontCacheHeaders } from '#lib/server/http/cdn-cache.ts';
import { siteOrigin } from '#lib/server/http/seo.ts';

const PAGE_SIZE = 100;
/** Stops a runaway loop if the catalog reports an inconsistent total. */
const MAX_PAGES = 50;

function escapeXml(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export const GET: RequestHandler = async (event) => {
	const { storefront } = event.locals.services.storefront;
	const origin = siteOrigin(event);

	const productSlugs: string[] = [];
	for (let page = 1; page <= MAX_PAGES; page++) {
		const list = unwrap(await storefront.listProducts({ page, pageSize: PAGE_SIZE }));
		productSlugs.push(...list.data.map((product) => product.slug));
		if (page * PAGE_SIZE >= list.total) break;
	}
	const categories = unwrap(await storefront.listCategories());

	const paths = [
		...Object.entries(staticMetaFor(DEFAULT_SITE_NAME))
			.filter(([, meta]) => !meta.noindex)
			.map(([path]) => path),
		...categories.map((category) => `/categories/${encodeURIComponent(category.slug)}`),
		...productSlugs.map((slug) => `/products/${encodeURIComponent(slug)}`)
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `\t<url><loc>${escapeXml(`${origin}${path}`)}</loc></url>`).join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			...storefrontCacheHeaders(86400)
		}
	});
};
