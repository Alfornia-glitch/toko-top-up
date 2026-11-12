import {
	createStorefrontService,
	type StorefrontDependencies,
	type StorefrontService
} from './application/storefront-service.ts';

export interface StorefrontServices {
	readonly storefront: StorefrontService;
}

export function createStorefrontServices(dependencies: StorefrontDependencies): StorefrontServices {
	return { storefront: createStorefrontService(dependencies) };
}
