import { m } from '#lib/paraglide/messages.js';
import { formatMoney } from '../commerce/format.ts';

/** Used until the store name loads; the live name comes from site settings. */
export const DEFAULT_SITE_NAME = 'Shopix';

export interface PageMeta {
	title: string;
	description: string;
	/** Absolute URL or a root-relative path that is resolved against the site origin. */
	image?: string | null;
	type?: 'website' | 'product';
	noindex?: boolean;
	jsonLd?: Record<string, unknown>;
}

/** Meta whose copy is resolved when read, so it follows the request/page locale. */
function localized(
	title: () => string,
	description: () => string,
	extra: Partial<PageMeta> = {}
): PageMeta {
	return {
		get title() {
			return title();
		},
		get description() {
			return description();
		},
		...extra
	};
}

/** Route ids that are public, indexable and identical for every visitor, so they are prerendered. */
export function staticMetaFor(siteName: string): Record<string, PageMeta> {
	const titled = (page: () => string) => () => `${page()} | ${siteName}`;

	return {
		'/': localized(
			() => siteName,
			() => m.storefront_seo_default_description()
		),
		'/products': localized(titled(m.storefront_seo_products_title), () =>
			m.storefront_seo_products_description({ site: siteName })
		),
		'/categories': localized(titled(m.storefront_seo_categories_title), () =>
			m.storefront_seo_categories_description({ site: siteName })
		),
		'/help': localized(titled(m.storefront_seo_help_title), () =>
			m.storefront_seo_help_description({ site: siteName })
		),
		'/help/shipping': localized(titled(m.storefront_seo_shipping_title), () =>
			m.storefront_seo_shipping_description({ site: siteName })
		),
		'/help/purchase-protection': localized(titled(m.storefront_seo_protection_title), () =>
			m.storefront_seo_protection_description({ site: siteName })
		),
		'/privacy-policy': localized(titled(m.storefront_seo_privacy_title), () =>
			m.storefront_seo_privacy_description({ site: siteName })
		)
	};
}

/** Route ids whose page component renders its own `<Seo>` from loaded data. */
export const DYNAMIC_SEO_ROUTES = new Set(['/products/[slug]', '/categories/[slug]']);

/** Everything else (account, checkout, auth, admin, prototype screens) stays out of search results. */
export function fallbackMeta(siteName: string): PageMeta {
	return localized(
		() => siteName,
		() => m.storefront_seo_default_description(),
		{ noindex: true }
	);
}

export function metaForRoute(routeId: string | null, siteName: string): PageMeta {
	return (routeId && staticMetaFor(siteName)[routeId]) || fallbackMeta(siteName);
}

function truncate(text: string, max = 160): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export interface ProductMetaSource {
	name: string;
	slug: string;
	description: string | null;
	shortDescription: string | null;
	price: number;
	currency: string;
	brandName: string | null;
	images: Array<{ url: string }>;
	variants?: Array<{ stock: number }>;
}

export function productMeta(product: ProductMetaSource, siteName: string): PageMeta {
	const currency = product.currency || 'IDR';
	const price = product.price;
	const summary = product.shortDescription || product.description;
	const description = truncate(
		summary
			? `${summary} — ${formatMoney(product.price, currency)}`
			: m.storefront_seo_product_fallback_description({
					name: product.name,
					price: formatMoney(product.price, currency),
					site: siteName
				})
	);
	const image = product.images[0]?.url ?? null;
	const inStock = product.variants ? product.variants.some((variant) => variant.stock > 0) : true;

	return {
		title: `${product.name} | ${siteName}`,
		description,
		image,
		type: 'product',
		jsonLd: {
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: product.name,
			description,
			...(image ? { image: [image] } : {}),
			...(product.brandName ? { brand: { '@type': 'Brand', name: product.brandName } } : {}),
			offers: {
				'@type': 'Offer',
				priceCurrency: currency,
				price,
				availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
			}
		}
	};
}

export interface CategoryMetaSource {
	name: string;
	description: string | null;
	imageUrl: string | null;
}

export function categoryMeta(category: CategoryMetaSource, siteName: string): PageMeta {
	return {
		title: `${category.name} | ${siteName}`,
		description: truncate(
			category.description ||
				m.storefront_seo_category_fallback_description({ name: category.name, site: siteName })
		),
		image: category.imageUrl
	};
}

export function absoluteUrl(value: string, origin: string): string {
	try {
		return new URL(value, origin).href;
	} catch {
		return value;
	}
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export interface MetaTag {
	kind: 'name' | 'property';
	key: string;
	content: string;
}

/** The `<meta>` tags for a page; shared by the server injection and the client `<Seo>` component. */
export function metaTags(meta: PageMeta, url: string, origin: string, siteName: string): MetaTag[] {
	const image = meta.image ? absoluteUrl(meta.image, origin) : null;
	const tags: MetaTag[] = [
		{ kind: 'name', key: 'description', content: meta.description },
		{ kind: 'name', key: 'robots', content: meta.noindex ? 'noindex, nofollow' : 'index, follow' },
		{ kind: 'property', key: 'og:site_name', content: siteName },
		{ kind: 'property', key: 'og:type', content: meta.type ?? 'website' },
		{ kind: 'property', key: 'og:title', content: meta.title },
		{ kind: 'property', key: 'og:description', content: meta.description },
		{ kind: 'property', key: 'og:url', content: url },
		{ kind: 'name', key: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
		{ kind: 'name', key: 'twitter:title', content: meta.title },
		{ kind: 'name', key: 'twitter:description', content: meta.description }
	];

	if (image) {
		tags.push(
			{ kind: 'property', key: 'og:image', content: image },
			{ kind: 'name', key: 'twitter:image', content: image }
		);
	}

	return tags;
}

/** Serialises JSON-LD so it cannot close the surrounding `<script>` element. */
export function jsonLdText(value: Record<string, unknown>): string {
	return JSON.stringify(value).replaceAll('<', '\\u003c');
}

/** HTML injected into prerendered and server-sent SPA shells so crawlers that skip JS still see it. */
export function renderMetaTags(
	meta: PageMeta,
	url: string,
	origin: string,
	siteName: string
): string {
	const parts = [
		`<title data-seo="ssr">${escapeHtml(meta.title)}</title>`,
		`<link data-seo="ssr" rel="canonical" href="${escapeHtml(url)}">`,
		...metaTags(meta, url, origin, siteName).map(
			(tag) => `<meta data-seo="ssr" ${tag.kind}="${tag.key}" content="${escapeHtml(tag.content)}">`
		)
	];

	if (meta.jsonLd) {
		parts.push(
			`<script data-seo="ssr" type="application/ld+json">${jsonLdText(meta.jsonLd)}</script>`
		);
	}

	return parts.join('\n\t\t');
}
