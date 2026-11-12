import {
	createCheckoutService,
	type CheckoutDependencies,
	type CheckoutService
} from './application/checkout-service.ts';

export interface CheckoutServices {
	readonly checkout: CheckoutService;
}

export function createCheckoutServices(dependencies: CheckoutDependencies): CheckoutServices {
	return { checkout: createCheckoutService(dependencies) };
}
