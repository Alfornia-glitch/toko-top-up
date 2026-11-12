import type { CheckoutSettings } from '#modules/checkout/server.ts';

const METHODS = new Map([
	['standard', { id: 'standard', priceCents: 500 }],
	['express', { id: 'express', priceCents: 2000 }]
]);

/** In-memory shipping settings for contract tests. */
export function createFakeCheckoutSettings(): CheckoutSettings {
	return {
		async getShippingMethod(id) {
			return METHODS.get(id) ?? null;
		},
		async getCurrency() {
			return 'USD';
		}
	};
}
