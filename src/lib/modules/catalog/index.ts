export { INVENTORY_EVENTS, PRODUCT_EVENTS } from './contracts.ts';
export type {
	CatalogEventMap,
	InventoryAdjustedPayload,
	InventoryEventMap,
	ProductCreatedPayload,
	ProductEventMap,
	ProductStatusChangedPayload,
	ProductUpdatedPayload
} from './contracts.ts';

export { brandStatusSchema, brandWriteSchema, slugify } from './modules/brands/index.ts';
export type {
	Brand,
	BrandOption,
	BrandStatus,
	BrandSummary,
	BrandWriteInput
} from './modules/brands/index.ts';

export { categoryStatusSchema, categoryWriteSchema } from './modules/categories/index.ts';
export type {
	Category,
	CategoryOption,
	CategoryStatus,
	CategorySummary,
	CategoryWriteInput
} from './modules/categories/index.ts';

export {
	productImageSchema,
	productListSchema,
	productOptionSchema,
	productOptionValueSchema,
	productStatusSchema,
	productVariantSchema,
	productVariantStatusSchema,
	productWriteSchema
} from './modules/products/index.ts';
export type {
	Product,
	ProductDetail,
	ProductImage,
	ProductListQuery,
	ProductListResult,
	ProductOption,
	ProductOptionValue,
	ProductStatus,
	ProductSummary,
	ProductVariant,
	ProductVariantStatus,
	ProductWriteInput
} from './modules/products/index.ts';

export {
	inventoryListSchema,
	movementListSchema,
	stockAdjustSchema
} from './modules/inventory/index.ts';
export type {
	InventoryListQuery,
	InventoryListResult,
	InventoryRow,
	MovementListQuery,
	MovementListResult,
	MovementRow,
	StockAdjustInput,
	StockAdjustment
} from './modules/inventory/index.ts';
