import type { CheckoutSettings } from '#modules/checkout/server.ts';
import { getSiteSettings } from '#lib/server/modules/storefront/site.ts';

/** Reads shipping methods and currency from the storefront site settings. */
export function createCheckoutSettings(): CheckoutSettings {
	return {
		async getShippingMethod(id) {
			const method = (await getSiteSettings()).shipping.find((entry) => entry.id === id);
			return method ? { id: method.id, priceCents: method.priceCents } : null;
		},

		async getCurrency() {
			return (await getSiteSettings()).currency;
		}
	};
}
