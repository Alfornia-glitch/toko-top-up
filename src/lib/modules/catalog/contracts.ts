export { INVENTORY_EVENTS } from './modules/inventory/index.ts';
export type { InventoryAdjustedPayload, InventoryEventMap } from './modules/inventory/index.ts';
export { PRODUCT_EVENTS } from './modules/products/index.ts';
export type {
	ProductCreatedPayload,
	ProductEventMap,
	ProductStatusChangedPayload,
	ProductUpdatedPayload
} from './modules/products/index.ts';

export type CatalogEventMap = import('./modules/products/index.ts').ProductEventMap &
	import('./modules/inventory/index.ts').InventoryEventMap;
