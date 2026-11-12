export const INVENTORY_EVENTS = {
	adjusted: 'catalog.inventory.adjusted'
} as const;

export interface InventoryAdjustedPayload {
	variantId: string;
	delta: number;
	stock: number;
	movementId: string;
}

export interface InventoryEventMap {
	'catalog.inventory.adjusted': InventoryAdjustedPayload;
}
