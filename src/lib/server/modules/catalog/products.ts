import { and, asc, count, desc, eq, inArray, like, ne, or, sum } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from './errors.ts';
import { uniqueSlug } from './slugs.ts';
import type { ProductListQuery, ProductWriteInput } from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

type ProductRow = typeof t.products.$inferSelect;

function productValues(input: ProductWriteInput, slug: string, createdBy?: string | null) {
	return {
		sku: input.sku,
		name: input.name,
		slug,
		description: input.description ?? null,
		shortDescription: input.shortDescription ?? null,
		brandId: input.brandId ?? null,
		categoryId: input.categoryId ?? null,
		status: input.status,
		priceCents: input.priceCents,
		compareAtPriceCents: input.compareAtPriceCents ?? null,
		currency: input.currency,
		isFeatured: input.isFeatured,
		isNewArrival: input.isNewArrival,
		isDeal: input.isDeal,
		dealEndsAt: input.dealEndsAt ? new Date(input.dealEndsAt) : null,
		specsJson: input.specsJson ?? null,
		shippingInfo: input.shippingInfo ?? null,
		returnPolicy: input.returnPolicy ?? null,
		...(createdBy ? { createdBy } : {})
	};
}

async function ensureSkuAvailable(sku: string, excludeId?: string) {
	const where = excludeId
		? and(eq(t.products.sku, sku), ne(t.products.id, excludeId))
		: eq(t.products.sku, sku);

	const [existing] = await queryDb
		.select({ id: t.products.id })
		.from(t.products)
		.where(where)
		.limit(1);

	if (existing) {
		throw new CatalogError(409, `SKU "${sku}" is already in use`);
	}
}

export async function listProducts(query: ProductListQuery) {
	const conditions = [];

	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(
			or(like(t.products.name, term), like(t.products.sku, term), like(t.products.slug, term))
		);
	}

	if (query.status) conditions.push(eq(t.products.status, query.status as any));
	if (query.categoryId) conditions.push(eq(t.products.categoryId, query.categoryId));
	if (query.brandId) conditions.push(eq(t.products.brandId, query.brandId));

	const where = conditions.length ? and(...conditions) : undefined;
	const sortMap: Record<string, unknown> = {
		name: t.products.name,
		sku: t.products.sku,
		price: t.products.priceCents,
		priceCents: t.products.priceCents,
		createdAt: t.products.createdAt,
		updatedAt: t.products.updatedAt
	};
	const rawSort = query.sort ?? '-updatedAt';
	const direction = rawSort.startsWith('-') ? 'desc' : 'asc';
	const sortColumn = sortMap[rawSort.replace(/^-/, '')] ?? t.products.updatedAt;
	const order = direction === 'desc' ? desc(sortColumn as any) : asc(sortColumn as any);
	const offset = (query.page - 1) * query.pageSize;

	const baseRows = await queryDb
		.select({
			id: t.products.id,
			sku: t.products.sku,
			name: t.products.name,
			slug: t.products.slug,
			status: t.products.status,
			priceCents: t.products.priceCents,
			compareAtPriceCents: t.products.compareAtPriceCents,
			currency: t.products.currency,
			isFeatured: t.products.isFeatured,
			updatedAt: t.products.updatedAt,
			brandName: t.brands.name,
			categoryName: t.categories.name
		})
		.from(t.products)
		.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
		.leftJoin(t.categories, eq(t.products.categoryId, t.categories.id))
		.where(where)
		.orderBy(order)
		.limit(query.pageSize)
		.offset(offset);

	const ids = baseRows.map((row: { id: string }) => row.id);
	const imageByProduct = new Map<string, string>();
	const stockByProduct = new Map<string, number>();

	if (ids.length) {
		const images = await queryDb
			.select({
				productId: t.productImages.productId,
				url: t.productImages.url
			})
			.from(t.productImages)
			.where(inArray(t.productImages.productId, ids))
			.orderBy(asc(t.productImages.position));

		for (const image of images) {
			if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image.url);
		}

		const stockRows = await queryDb
			.select({
				productId: t.productVariants.productId,
				value: sum(t.productVariants.stock)
			})
			.from(t.productVariants)
			.where(inArray(t.productVariants.productId, ids))
			.groupBy(t.productVariants.productId);

		for (const row of stockRows) {
			stockByProduct.set(row.productId, Number(row.value ?? 0));
		}
	}

	const [{ value: total }] = await queryDb.select({ value: count() }).from(t.products).where(where);

	return {
		data: baseRows.map((row: (typeof baseRows)[number]) => ({
			...row,
			imageUrl: imageByProduct.get(row.id) ?? null,
			stock: stockByProduct.get(row.id) ?? 0
		})),
		page: query.page,
		pageSize: query.pageSize,
		total: Number(total ?? 0)
	};
}

export async function getProduct(id: string) {
	const [product] = await queryDb
		.select({
			id: t.products.id,
			sku: t.products.sku,
			name: t.products.name,
			slug: t.products.slug,
			description: t.products.description,
			shortDescription: t.products.shortDescription,
			brandId: t.products.brandId,
			categoryId: t.products.categoryId,
			status: t.products.status,
			priceCents: t.products.priceCents,
			compareAtPriceCents: t.products.compareAtPriceCents,
			currency: t.products.currency,
			isFeatured: t.products.isFeatured,
			isNewArrival: t.products.isNewArrival,
			isDeal: t.products.isDeal,
			dealEndsAt: t.products.dealEndsAt,
			specsJson: t.products.specsJson,
			shippingInfo: t.products.shippingInfo,
			returnPolicy: t.products.returnPolicy,
			createdAt: t.products.createdAt,
			updatedAt: t.products.updatedAt,
			brandName: t.brands.name,
			categoryName: t.categories.name
		})
		.from(t.products)
		.leftJoin(t.brands, eq(t.products.brandId, t.brands.id))
		.leftJoin(t.categories, eq(t.products.categoryId, t.categories.id))
		.where(eq(t.products.id, id))
		.limit(1);

	if (!product) return null;

	const images = await queryDb
		.select()
		.from(t.productImages)
		.where(eq(t.productImages.productId, id))
		.orderBy(asc(t.productImages.position));

	const options = await queryDb
		.select()
		.from(t.productOptions)
		.where(eq(t.productOptions.productId, id))
		.orderBy(asc(t.productOptions.position));

	const optionIds = options.map((option: { id: string }) => option.id);
	const values = optionIds.length
		? await queryDb
				.select()
				.from(t.productOptionValues)
				.where(inArray(t.productOptionValues.optionId, optionIds))
				.orderBy(asc(t.productOptionValues.position))
		: [];

	const variants = await queryDb
		.select()
		.from(t.productVariants)
		.where(eq(t.productVariants.productId, id))
		.orderBy(asc(t.productVariants.name));

	return {
		...product,
		images,
		options: options.map((option: { id: string }) => ({
			...option,
			values: values.filter((value: { optionId: string }) => value.optionId === option.id)
		})),
		variants
	};
}

export async function createProduct(input: ProductWriteInput, actorId: string) {
	await ensureSkuAvailable(input.sku);
	const slug = await uniqueSlug(t.products, t.products.slug, input.slug ?? input.name);
	const id = crypto.randomUUID();
	const now = new Date();

	await queryDb.transaction(async (tx: any) => {
		await tx.insert(t.products).values({
			id,
			...productValues(input, slug, actorId),
			createdAt: now,
			updatedAt: now
		});

		if (input.images.length) {
			await tx.insert(t.productImages).values(
				input.images.map((image) => ({
					id: image.id ?? crypto.randomUUID(),
					productId: id,
					url: image.url,
					path: image.path ?? null,
					alt: image.alt ?? null,
					position: image.position,
					createdAt: now,
					updatedAt: now
				}))
			);
		}

		for (const option of input.options) {
			const optionId = option.id ?? crypto.randomUUID();

			await tx.insert(t.productOptions).values({
				id: optionId,
				productId: id,
				name: option.name,
				position: option.position,
				createdAt: now,
				updatedAt: now
			});

			if (option.values.length) {
				await tx.insert(t.productOptionValues).values(
					option.values.map((value) => ({
						id: value.id ?? crypto.randomUUID(),
						optionId,
						value: value.value,
						colorHex: value.colorHex ?? null,
						position: value.position,
						createdAt: now,
						updatedAt: now
					}))
				);
			}
		}

		if (input.variants.length) {
			await tx.insert(t.productVariants).values(
				input.variants.map((variant) => ({
					id: variant.id ?? crypto.randomUUID(),
					productId: id,
					sku: variant.sku,
					name: variant.name,
					priceCents: variant.priceCents,
					compareAtPriceCents: variant.compareAtPriceCents ?? null,
					stock: variant.stock,
					weightGrams: variant.weightGrams ?? null,
					status: variant.status,
					optionValuesJson: variant.optionValuesJson ?? null,
					createdAt: now,
					updatedAt: now
				}))
			);
		}
	});

	return getProduct(id);
}

export async function updateProduct(id: string, input: ProductWriteInput) {
	const existing = await getProduct(id);
	if (!existing) return null;

	await ensureSkuAvailable(input.sku, id);
	const slug = await uniqueSlug(t.products, t.products.slug, input.slug ?? input.name, id);
	const now = new Date();

	await queryDb.transaction(async (tx: any) => {
		await tx
			.update(t.products)
			.set({ ...productValues(input, slug), updatedAt: now })
			.where(eq(t.products.id, id));

		await tx.delete(t.productImages).where(eq(t.productImages.productId, id));
		await tx.delete(t.productOptions).where(eq(t.productOptions.productId, id));

		if (input.images.length) {
			await tx.insert(t.productImages).values(
				input.images.map((image) => ({
					id: image.id ?? crypto.randomUUID(),
					productId: id,
					url: image.url,
					path: image.path ?? null,
					alt: image.alt ?? null,
					position: image.position,
					createdAt: now,
					updatedAt: now
				}))
			);
		}

		for (const option of input.options) {
			const optionId = option.id ?? crypto.randomUUID();

			await tx.insert(t.productOptions).values({
				id: optionId,
				productId: id,
				name: option.name,
				position: option.position,
				createdAt: now,
				updatedAt: now
			});

			if (option.values.length) {
				await tx.insert(t.productOptionValues).values(
					option.values.map((value) => ({
						id: value.id ?? crypto.randomUUID(),
						optionId,
						value: value.value,
						colorHex: value.colorHex ?? null,
						position: value.position,
						createdAt: now,
						updatedAt: now
					}))
				);
			}
		}

		const existingVariantIds = new Set<string>(
			existing.variants.map((variant: { id: string }) => variant.id)
		);
		const keptVariantIds = new Set<string>();

		for (const variant of input.variants) {
			const values = {
				sku: variant.sku,
				name: variant.name,
				priceCents: variant.priceCents,
				compareAtPriceCents: variant.compareAtPriceCents ?? null,
				stock: variant.stock,
				weightGrams: variant.weightGrams ?? null,
				status: variant.status,
				optionValuesJson: variant.optionValuesJson ?? null,
				updatedAt: now
			};

			if (variant.id && existingVariantIds.has(variant.id)) {
				keptVariantIds.add(variant.id);
				await tx.update(t.productVariants).set(values).where(eq(t.productVariants.id, variant.id));
			} else {
				const variantId = crypto.randomUUID();
				keptVariantIds.add(variantId);
				await tx.insert(t.productVariants).values({
					id: variantId,
					productId: id,
					...values,
					createdAt: now
				});
			}
		}

		const removed = [...existingVariantIds].filter((variantId) => !keptVariantIds.has(variantId));

		if (removed.length) {
			await tx
				.update(t.productVariants)
				.set({ status: 'inactive', stock: 0, updatedAt: now })
				.where(inArray(t.productVariants.id, removed));
		}
	});

	return getProduct(id);
}

export async function setProductStatus(
	id: string,
	status: 'draft' | 'active' | 'archived'
): Promise<boolean> {
	const result = await queryDb
		.update(t.products)
		.set({ status, updatedAt: new Date() })
		.where(eq(t.products.id, id))
		.returning({ id: t.products.id });

	return result.length > 0;
}

export function productSummary(product: ProductRow) {
	return {
		id: product.id,
		name: product.name,
		sku: product.sku
	};
}
