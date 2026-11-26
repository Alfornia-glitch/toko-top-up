import { unwrap } from '#shared';
import type { CheckoutSettings } from '#modules/checkout/server.ts';
import type { StorefrontService } from '#modules/storefront/server.ts';

/** Reads shipping methods and currency from the storefront site settings. */
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
		}
	};
}
