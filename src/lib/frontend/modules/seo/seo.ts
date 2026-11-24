import { ZERO_DECIMAL, formatMoney } from '../commerce/format.ts';

/** Shown in titles and Open Graph `site_name`; change it when the store gets its final brand. */
export const SITE_NAME = 'Shopix';

const DEFAULT_DESCRIPTION =
	'Belanja produk pilihan dengan harga terbaik, pembayaran QRIS, dan pengiriman ke seluruh Indonesia.';

export interface PageMeta {
	title: string;
	description: string;
	/** Absolute URL or a root-relative path that is resolved against the site origin. */
	image?: string | null;
	type?: 'website' | 'product';
	noindex?: boolean;
	jsonLd?: Record<string, unknown>;
}

/** Route ids that are public, indexable and identical for every visitor, so they are prerendered. */
export const STATIC_META: Record<string, PageMeta> = {
	'/': { title: SITE_NAME, description: DEFAULT_DESCRIPTION },
	'/products': {
		title: `Semua Produk | ${SITE_NAME}`,
		description: `Jelajahi katalog lengkap ${SITE_NAME}: produk terbaru, promo, dan terlaris.`
	},
	'/categories': {
		title: `Kategori | ${SITE_NAME}`,
		description: `Temukan produk ${SITE_NAME} berdasarkan kategori.`
	},
	'/help': {
		title: `Bantuan | ${SITE_NAME}`,
		description: `Pusat bantuan ${SITE_NAME}: pemesanan, pembayaran, dan pengiriman.`
	},
	'/help/shipping': {
		title: `Pengiriman | ${SITE_NAME}`,
		description: `Informasi metode, biaya, dan estimasi pengiriman ${SITE_NAME}.`
	},
	'/help/purchase-protection': {
		title: `Perlindungan Pembelian | ${SITE_NAME}`,
		description: `Bagaimana ${SITE_NAME} melindungi setiap pembelian Anda.`
	},
	'/privacy-policy': {
		title: `Kebijakan Privasi | ${SITE_NAME}`,
		description: `Kebijakan privasi ${SITE_NAME}.`
	}
};

/** Route ids whose page component renders its own `<Seo>` from loaded data. */
export const DYNAMIC_SEO_ROUTES = new Set(['/products/[slug]', '/categories/[slug]']);

/** Everything else (account, checkout, auth, admin, prototype screens) stays out of search results. */
export const FALLBACK_META: PageMeta = {
	title: SITE_NAME,
	description: DEFAULT_DESCRIPTION,
	noindex: true
};

export function metaForRoute(routeId: string | null): PageMeta {
	return (routeId && STATIC_META[routeId]) || FALLBACK_META;
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
	priceCents: number;
	currency: string;
	brandName: string | null;
	images: Array<{ url: string }>;
	variants?: Array<{ stock: number }>;
}

export function productMeta(product: ProductMetaSource): PageMeta {
	const currency = product.currency || 'IDR';
	const price = ZERO_DECIMAL.has(currency) ? product.priceCents : product.priceCents / 100;
	const summary = product.shortDescription || product.description;
	const description = truncate(
		summary
			? `${summary} — ${formatMoney(product.priceCents, currency)}`
			: `Beli ${product.name} seharga ${formatMoney(product.priceCents, currency)} di ${SITE_NAME}.`
	);
	const image = product.images[0]?.url ?? null;
	const inStock = product.variants ? product.variants.some((variant) => variant.stock > 0) : true;

	return {
		title: `${product.name} | ${SITE_NAME}`,
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

export function categoryMeta(category: CategoryMetaSource): PageMeta {
	return {
		title: `${category.name} | ${SITE_NAME}`,
		description: truncate(
			category.description || `Belanja produk ${category.name} pilihan di ${SITE_NAME}.`
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
export function metaTags(meta: PageMeta, url: string, origin: string): MetaTag[] {
	const image = meta.image ? absoluteUrl(meta.image, origin) : null;
	const tags: MetaTag[] = [
		{ kind: 'name', key: 'description', content: meta.description },
		{ kind: 'name', key: 'robots', content: meta.noindex ? 'noindex, nofollow' : 'index, follow' },
		{ kind: 'property', key: 'og:site_name', content: SITE_NAME },
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
export function renderMetaTags(meta: PageMeta, url: string, origin: string): string {
	const parts = [
		`<title data-seo="ssr">${escapeHtml(meta.title)}</title>`,
		`<link data-seo="ssr" rel="canonical" href="${escapeHtml(url)}">`,
		...metaTags(meta, url, origin).map(
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
