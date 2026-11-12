import { z } from 'zod';

export const productStatusSchema = z.enum(['draft', 'active', 'archived']);

export const productVariantStatusSchema = z.enum(['active', 'inactive']);

const productPaginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(25),
	q: z.string().trim().max(200).optional(),
	status: z.string().trim().max(40).optional(),
	sort: z.string().trim().max(40).optional()
});

export const productListSchema = productPaginationSchema.extend({
	categoryId: z.string().trim().max(100).optional(),
	brandId: z.string().trim().max(100).optional()
});

export const productImageSchema = z.object({
	id: z.string().trim().max(100).optional(),
	url: z.string().trim().min(1).max(2000),
	path: z.string().trim().max(500).nullable().optional(),
	alt: z.string().trim().max(250).nullable().optional(),
	position: z.number().int().min(0).default(0)
});

export const productOptionValueSchema = z.object({
	id: z.string().trim().max(100).optional(),
	value: z.string().trim().min(1).max(100),
	colorHex: z.string().trim().max(20).nullable().optional(),
	position: z.number().int().min(0).default(0)
});

export const productOptionSchema = z.object({
	id: z.string().trim().max(100).optional(),
	name: z.string().trim().min(1).max(100),
	position: z.number().int().min(0).default(0),
	values: z.array(productOptionValueSchema).max(100).default([])
});

export const productVariantSchema = z.object({
	id: z.string().trim().max(100).optional(),
	sku: z.string().trim().min(1).max(100),
	name: z.string().trim().min(1).max(200),
	priceCents: z.number().int().min(0),
	compareAtPriceCents: z.number().int().min(0).nullable().optional(),
	stock: z.number().int().min(0).default(0),
	weightGrams: z.number().int().min(0).nullable().optional(),
	status: productVariantStatusSchema.default('active'),
	optionValuesJson: z.record(z.string(), z.string()).nullable().optional()
});

export const productWriteSchema = z.object({
	sku: z.string().trim().min(1).max(100),
	name: z.string().trim().min(1).max(250),
	slug: z.string().trim().min(1).max(250).optional(),
	description: z.string().trim().max(20000).nullable().optional(),
	shortDescription: z.string().trim().max(1000).nullable().optional(),
	brandId: z.string().trim().max(100).nullable().optional(),
	categoryId: z.string().trim().max(100).nullable().optional(),
	status: productStatusSchema.default('draft'),
	priceCents: z.number().int().min(0),
	compareAtPriceCents: z.number().int().min(0).nullable().optional(),
	currency: z.string().trim().length(3).default('USD'),
	isFeatured: z.boolean().default(false),
	isNewArrival: z.boolean().default(false),
	isDeal: z.boolean().default(false),
	dealEndsAt: z.string().datetime().nullable().optional(),
	specsJson: z.record(z.string(), z.unknown()).nullable().optional(),
	shippingInfo: z.string().trim().max(5000).nullable().optional(),
	returnPolicy: z.string().trim().max(5000).nullable().optional(),
	images: z.array(productImageSchema).max(30).default([]),
	options: z.array(productOptionSchema).max(20).default([]),
	variants: z.array(productVariantSchema).max(500).default([])
});

export type ProductStatus = z.infer<typeof productStatusSchema>;
export type ProductVariantStatus = z.infer<typeof productVariantStatusSchema>;
export type ProductListQuery = z.infer<typeof productListSchema>;
export type ProductWriteInput = z.input<typeof productWriteSchema>;
export type ProductWrite = z.infer<typeof productWriteSchema>;

export interface Product {
	id: string;
	sku: string;
	name: string;
	slug: string;
	description: string | null;
	shortDescription: string | null;
	brandId: string | null;
	categoryId: string | null;
	status: ProductStatus;
	priceCents: number;
	compareAtPriceCents: number | null;
	currency: string;
	isFeatured: boolean;
	isNewArrival: boolean;
	isDeal: boolean;
	dealEndsAt: Date | null;
	specsJson: Record<string, unknown> | null;
	shippingInfo: string | null;
	returnPolicy: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductImage {
	id: string;
	productId: string;
	url: string;
	path: string | null;
	alt: string | null;
	position: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductOptionValue {
	id: string;
	optionId: string;
	value: string;
	colorHex: string | null;
	position: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductOption {
	id: string;
	productId: string;
	name: string;
	position: number;
	createdAt: Date;
	updatedAt: Date;
	values: ProductOptionValue[];
}

export interface ProductVariant {
	id: string;
	productId: string;
	sku: string;
	name: string;
	priceCents: number;
	compareAtPriceCents: number | null;
	stock: number;
	weightGrams: number | null;
	status: ProductVariantStatus;
	optionValuesJson: Record<string, string> | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductDetail extends Product {
	brandName: string | null;
	categoryName: string | null;
	images: ProductImage[];
	options: ProductOption[];
	variants: ProductVariant[];
}

export interface ProductSummary {
	id: string;
	sku: string;
	name: string;
	slug: string;
	status: ProductStatus;
	priceCents: number;
	compareAtPriceCents: number | null;
	currency: string;
	isFeatured: boolean;
	updatedAt: Date;
	brandName: string | null;
	categoryName: string | null;
	imageUrl: string | null;
	stock: number;
}

export interface ProductListResult {
	data: ProductSummary[];
	page: number;
	pageSize: number;
	total: number;
}

export interface ProductIdentity {
	id: string;
}

/** Everything a cart or checkout needs to know about a variant, read in one call. */
export interface VariantSnapshot {
	variantId: string;
	sku: string;
	name: string;
	status: 'active' | 'inactive';
	priceCents: number;
	compareAtPriceCents: number | null;
	stock: number;
	productId: string;
	productSlug: string;
	productName: string;
	productCurrency: string;
	brandName: string | null;
	imageUrl: string | null;
}
