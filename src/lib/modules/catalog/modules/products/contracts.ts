import type { ProductStatus } from './domain/product.ts';

export const PRODUCT_EVENTS = {
	created: 'catalog.product.created',
	updated: 'catalog.product.updated',
	statusChanged: 'catalog.product.status-changed'
} as const;

export interface ProductCreatedPayload {
	productId: string;
	sku: string;
	status: ProductStatus;
}

export interface ProductUpdatedPayload {
	productId: string;
	sku: string;
	status: ProductStatus;
}

export interface ProductStatusChangedPayload {
	productId: string;
	sku: string;
	status: ProductStatus;
}

export interface ProductEventMap {
	'catalog.product.created': ProductCreatedPayload;
	'catalog.product.updated': ProductUpdatedPayload;
	'catalog.product.status-changed': ProductStatusChangedPayload;
}
