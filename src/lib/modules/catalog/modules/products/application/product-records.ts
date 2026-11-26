import { newId } from '#shared';
import type { ProductStatus, ProductVariantStatus, ProductWrite } from '../domain/product.ts';

export interface ProductValues {
	sku: string;
	name: string;
	slug: string;
	description: string | null;
	shortDescription: string | null;
	brandId: string | null;
	categoryId: string | null;
	status: ProductStatus;
	price: number;
	compareAtPrice: number | null;
	currency: string;
	isFeatured: boolean;
	isNewArrival: boolean;
	isDeal: boolean;
	dealEndsAt: Date | null;
	specsJson: Record<string, unknown> | null;
	shippingInfo: string | null;
	returnPolicy: string | null;
}

export interface ProductImageRecord {
	id: string;
	productId: string;
	url: string;
	path: string | null;
	alt: string | null;
	position: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductOptionRecord {
	id: string;
	productId: string;
	name: string;
	position: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductOptionValueRecord {
	id: string;
	optionId: string;
	value: string;
	colorHex: string | null;
	position: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductVariantRecord {
	id: string;
	productId: string;
	sku: string;
	name: string;
	price: number;
	compareAtPrice: number | null;
	stock: number;
	weightGrams: number | null;
	status: ProductVariantStatus;
	optionValuesJson: Record<string, string> | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface ProductVariantUpdateValues {
	sku: string;
	name: string;
	price: number;
	compareAtPrice: number | null;
	stock: number;
	weightGrams: number | null;
	status: ProductVariantStatus;
	optionValuesJson: Record<string, string> | null;
	updatedAt: Date;
}

export interface ProductOptionRecords {
	option: ProductOptionRecord;
	values: ProductOptionValueRecord[];
}

export interface ProductVariantChanges {
	updates: Array<{ id: string; values: ProductVariantUpdateValues }>;
	inserts: ProductVariantRecord[];
	removedIds: string[];
}

export function toProductValues(input: ProductWrite, slug: string): ProductValues {
	return {
		sku: input.sku,
		name: input.name,
		slug,
		description: input.description ?? null,
		shortDescription: input.shortDescription ?? null,
		brandId: input.brandId ?? null,
		categoryId: input.categoryId ?? null,
		status: input.status,
		price: input.price,
		compareAtPrice: input.compareAtPrice ?? null,
		currency: input.currency,
		isFeatured: input.isFeatured,
		isNewArrival: input.isNewArrival,
		isDeal: input.isDeal,
		dealEndsAt: input.dealEndsAt ? new Date(input.dealEndsAt) : null,
		specsJson: input.specsJson ?? null,
		shippingInfo: input.shippingInfo ?? null,
		returnPolicy: input.returnPolicy ?? null
	};
}

export function toImageRecords(
	images: ProductWrite['images'],
	productId: string,
	now: Date
): ProductImageRecord[] {
	return images.map((image) => ({
		id: image.id ?? newId(),
		productId,
		url: image.url,
		path: image.path ?? null,
		alt: image.alt ?? null,
		position: image.position,
		createdAt: now,
		updatedAt: now
	}));
}

export function toOptionRecords(
	options: ProductWrite['options'],
	productId: string,
	now: Date
): ProductOptionRecords[] {
	return options.map((option) => {
		const optionId = option.id ?? newId();

		return {
			option: {
				id: optionId,
				productId,
				name: option.name,
				position: option.position,
				createdAt: now,
				updatedAt: now
			},
			values: option.values.map((value) => ({
				id: value.id ?? newId(),
				optionId,
				value: value.value,
				colorHex: value.colorHex ?? null,
				position: value.position,
				createdAt: now,
				updatedAt: now
			}))
		};
	});
}

export function toVariantRecords(
	variants: ProductWrite['variants'],
	productId: string,
	now: Date
): ProductVariantRecord[] {
	return variants.map((variant) => ({
		id: variant.id ?? newId(),
		productId,
		sku: variant.sku,
		name: variant.name,
		price: variant.price,
		compareAtPrice: variant.compareAtPrice ?? null,
		stock: variant.stock,
		weightGrams: variant.weightGrams ?? null,
		status: variant.status,
		optionValuesJson: variant.optionValuesJson ?? null,
		createdAt: now,
		updatedAt: now
	}));
}

export function toVariantChanges(
	variants: ProductWrite['variants'],
	productId: string,
	existingIds: ReadonlySet<string>,
	now: Date
): ProductVariantChanges {
	const updates: ProductVariantChanges['updates'] = [];
	const inserts: ProductVariantRecord[] = [];
	const keptIds = new Set<string>();

	for (const variant of variants) {
		const values: ProductVariantUpdateValues = {
			sku: variant.sku,
			name: variant.name,
			price: variant.price,
			compareAtPrice: variant.compareAtPrice ?? null,
			stock: variant.stock,
			weightGrams: variant.weightGrams ?? null,
			status: variant.status,
			optionValuesJson: variant.optionValuesJson ?? null,
			updatedAt: now
		};

		if (variant.id && existingIds.has(variant.id)) {
			keptIds.add(variant.id);
			updates.push({ id: variant.id, values });
			continue;
		}

		const id = newId();
		keptIds.add(id);
		inserts.push({
			id,
			productId,
			sku: variant.sku,
			name: variant.name,
			price: variant.price,
			compareAtPrice: variant.compareAtPrice ?? null,
			stock: variant.stock,
			weightGrams: variant.weightGrams ?? null,
			status: variant.status,
			optionValuesJson: variant.optionValuesJson ?? null,
			createdAt: now,
			updatedAt: now
		});
	}

	return {
		updates,
		inserts,
		removedIds: [...existingIds].filter((id) => !keptIds.has(id))
	};
}
