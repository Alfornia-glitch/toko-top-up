import { m } from '#lib/paraglide/messages.js';

// Labels are getters so they resolve with the locale at render time, not at module load.

export const FOOTER_EXPLORE = [
	{
		get label() {
			return m.components_regular_footer_product_listing();
		}
	},
	{
		get label() {
			return m.components_regular_footer_my_profile();
		}
	},
	{
		get label() {
			return m.components_regular_footer_category_listing();
		}
	}
];

export const FOOTER_TERMS = [
	{
		get label() {
			return m.storefront_nav_privacy();
		}
	},
	{
		get label() {
			return m.storefront_nav_purchase_protection();
		}
	},
	{
		get label() {
			return m.storefront_nav_help();
		}
	}
];

export const FOOTER_FEATURES = [
	{
		get title() {
			return m.components_regular_feature_delivery_title();
		},
		get text() {
			return m.components_regular_feature_delivery_text();
		}
	},
	{
		get title() {
			return m.components_regular_feature_payment_title();
		},
		get text() {
			return m.components_regular_feature_payment_text();
		}
	},
	{
		get title() {
			return m.components_regular_feature_return_title();
		},
		get text() {
			return m.components_regular_feature_return_text();
		}
	}
];

/** Footer legal line in the active locale. Call it at render time. */
export function footerLegal(brand: string): string {
	return m.components_regular_footer_legal({ year: new Date().getFullYear(), brand });
}
