import type {
	InventoryListQuery,
	InventoryRow,
	MovementListQuery,
	MovementRow,
	StockAdjustInput,
	StockAdjustOutcome
} from '../domain/inventory.ts';

export interface InventoryListRecord {
	data: InventoryRow[];
	total: number;
}

export interface MovementListRecord {
	data: MovementRow[];
	total: number;
}

export interface StockAdjustMeta {
	movementId: string;
	actorId: string;
	now: Date;
}

export interface InventoryRepository {
	listVariants(query: InventoryListQuery): Promise<InventoryListRecord>;
	listMovements(query: MovementListQuery): Promise<MovementListRecord>;
	adjustStock(input: StockAdjustInput, meta: StockAdjustMeta): Promise<StockAdjustOutcome>;
}
