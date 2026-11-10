import { z } from 'zod';

const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(25),
	q: z.string().trim().max(200).optional(),
	status: z.string().trim().max(40).optional(),
	sort: z.string().trim().max(40).optional()
});

export const inventoryListSchema = paginationSchema.extend({
	variantId: z.string().trim().max(100).optional(),
	lowStock: z
		.enum(['true', 'false'])
		.optional()
		.transform((value) => value === 'true')
});

export const stockAdjustSchema = z.object({
	variantId: z.string().trim().min(1).max(100),
	delta: z
		.number()
		.int()
		.refine((value) => value !== 0, 'Delta must not be zero'),
	reason: z.string().trim().min(1).max(250),
	referenceType: z.string().trim().max(100).nullable().optional(),
	referenceId: z.string().trim().max(100).nullable().optional()
});

export const movementListSchema = paginationSchema.extend({
	variantId: z.string().trim().max(100).optional()
});

export type InventoryListQuery = z.infer<typeof inventoryListSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
export type MovementListQuery = z.infer<typeof movementListSchema>;

export interface InventoryRow {
	id: string;
	sku: string;
	name: string;
	stock: number;
	status: 'active' | 'inactive';
	priceCents: number;
	productId: string;
	productName: string;
	productSku: string;
}

export interface MovementRow {
	id: string;
	variantId: string;
	delta: number;
	reason: string;
	referenceType: string | null;
	referenceId: string | null;
	createdAt: Date;
	variantName: string;
	variantSku: string;
	productName: string;
}

export interface StockAdjustment {
	id: string;
	sku: string;
	name: string;
	stock: number;
	movementId: string;
}

export interface InventoryListResult {
	data: InventoryRow[];
	page: number;
	pageSize: number;
	total: number;
}

export interface MovementListResult {
	data: MovementRow[];
	page: number;
	pageSize: number;
	total: number;
}

export type StockAdjustOutcome =
	| { kind: 'not_found' }
	| { kind: 'negative'; currentStock: number }
	| { kind: 'adjusted'; adjustment: StockAdjustment };
