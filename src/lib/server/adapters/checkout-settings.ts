import { unwrap } from '#shared';
import type { CheckoutSettings } from '#modules/checkout/server.ts';
import type { StorefrontService } from '#modules/storefront/server.ts';

/** Reads shipping methods, currency and the top-up account form from the storefront site settings. */
export function createCheckoutSettings(storefront: StorefrontService): CheckoutSettings {
	return {
		async getShippingMethod(id) {
			const method = unwrap(await storefront.getSiteSettings()).shipping.find(
				(entry) => entry.id === id
			);
			return method ? { id: method.id, price: method.price } : null;
		},

		async getCurrency() {
			return unwrap(await storefront.getSiteSettings()).currency;
		},

		async getAccountForm() {
			const settings = unwrap(await storefront.getSiteSettings());
			return settings.storefrontLayout === 'topup' ? settings.topupAccountForm : null;
		}
	};
}
