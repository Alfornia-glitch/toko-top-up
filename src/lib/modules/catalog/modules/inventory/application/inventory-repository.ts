import type {
	InventoryListQuery,
	InventoryRow,
	MovementListQuery,
	MovementRow,
	StockAdjustInput,
	InventoryReportVariant,
	MovementTotal,
	StockAdjustOutcome,
	StockLine,
	StockReference,
	StockReserveOutcome
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
	listAllVariants(): Promise<InventoryReportVariant[]>;
	movementTotalsSince(since: Date, limit: number): Promise<MovementTotal[]>;
	/**
	 * Decrements every line atomically: a guarded update per variant inside one
	 * transaction, rolled back entirely when any line cannot be fulfilled.
	 */
	reserveStock(
		lines: StockLine[],
		reference: StockReference,
		meta: { now: Date; newId: () => string }
	): Promise<StockReserveOutcome>;
	/** Returns previously reserved quantities to stock and records the movements. */
	releaseStock(
		lines: StockLine[],
		reference: StockReference,
		meta: { now: Date; newId: () => string }
	): Promise<Array<{ variantId: string; stock: number; movementId: string }>>;
}
