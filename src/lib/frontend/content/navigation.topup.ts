import { m } from '#lib/paraglide/messages.js';

// `label` is a getter so it resolves with the locale at render time, not at module load.
export const HEADER_NAV_LINKS = [
	{
		get label() {
			return m.storefront_nav_home();
		},
		href: '/',
		icon: 'home'
	},
	{
		get label() {
			return m.storefront_nav_check_invoice();
		},
		href: '/account/order-tracking',
		icon: 'receipt'
	},
	{
		get label() {
			return m.storefront_nav_price_list();
		},
		href: '/products',
		icon: 'tag'
	},
	{
		get label() {
			return m.storefront_nav_all_games();
		},
		href: '/categories',
		icon: 'gamepad'
	},
	{
		get label() {
			return m.storefront_nav_help();
		},
		href: '/help',
		icon: 'help'
	},
	{
		get label() {
			return m.storefront_nav_contact();
		},
		href: '/account/support-tickets',
		icon: 'headset'
	}
] as const;

export const FOOTER_LINKS = [
	{
		get label() {
			return m.storefront_nav_check_invoice();
		},
		href: '/account/order-tracking'
	},
	{
		get label() {
			return m.storefront_nav_price_list();
		},
		href: '/products'
	},
	{
		get label() {
			return m.storefront_nav_help();
		},
		href: '/help'
	},
	{
		get label() {
			return m.storefront_nav_privacy();
		},
		href: '/privacy-policy'
	},
	{
		get label() {
			return m.storefront_nav_purchase_protection();
		},
		href: '/help/purchase-protection'
	}
];

/** Footer legal line in the active locale. Call it at render time. */
export function footerLegal(brand: string): string {
	return m.storefront_footer_legal({ year: new Date().getFullYear(), brand });
}
