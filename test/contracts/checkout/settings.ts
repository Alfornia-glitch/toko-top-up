import type { AccountFormField, CheckoutSettings } from '#modules/checkout/server.ts';

const METHODS = new Map([
	['standard', { id: 'standard', price: 500 }],
	['express', { id: 'express', price: 2000 }]
]);

/**
 * In-memory shipping settings for contract tests. Pass an account form to
 * simulate a top-up store.
 */
export function createFakeCheckoutSettings(
	accountForm: AccountFormField[] | null = null
): CheckoutSettings {
	return {
		async getShippingMethod(id) {
			return METHODS.get(id) ?? null;
		},
		async getCurrency() {
			return 'USD';
		},
		async getAccountForm() {
			return accountForm;
		}
	};
}
