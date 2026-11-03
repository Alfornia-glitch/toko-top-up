import { asc, count, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { uniqueSlug } from './slugs.ts';
import type { BrandWriteInput } from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listBrands() {
	const rows = await queryDb
		.select({
			id: t.brands.id,
			name: t.brands.name,
			slug: t.brands.slug,
			logoUrl: t.brands.logoUrl,
			description: t.brands.description,
			status: t.brands.status,
			updatedAt: t.brands.updatedAt
		})
		.from(t.brands)
		.orderBy(asc(t.brands.name));

	const counts = await queryDb
		.select({ brandId: t.products.brandId, value: count() })
		.from(t.products)
		.groupBy(t.products.brandId);

	const countByBrand = new Map<string, number>(
		counts.map((row: { brandId: string; value: number }) => [row.brandId, Number(row.value ?? 0)])
	);

	return rows.map((row: { id: string }) => ({
		...row,
		productCount: countByBrand.get(row.id) ?? 0
	}));
}

export async function createBrand(input: BrandWriteInput) {
	const slug = await uniqueSlug(t.brands, t.brands.slug, input.slug ?? input.name);
	const id = crypto.randomUUID();
	const now = new Date();

	await queryDb.insert(t.brands).values({
		id,
		name: input.name,
		slug,
		logoUrl: input.logoUrl ?? null,
		description: input.description ?? null,
		status: input.status,
		createdAt: now,
		updatedAt: now
	});

	return id;
}

export async function updateBrand(id: string, input: BrandWriteInput) {
	const [existing] = await queryDb
		.select({ id: t.brands.id })
		.from(t.brands)
		.where(eq(t.brands.id, id))
		.limit(1);

	if (!existing) return false;

	const slug = await uniqueSlug(t.brands, t.brands.slug, input.slug ?? input.name, id);

	await queryDb
		.update(t.brands)
		.set({
			name: input.name,
			slug,
			logoUrl: input.logoUrl ?? null,
			description: input.description ?? null,
			status: input.status,
			updatedAt: new Date()
		})
		.where(eq(t.brands.id, id));

	return true;
}

export async function deleteBrand(id: string): Promise<'deleted' | 'not_found' | 'in_use'> {
	const [existing] = await queryDb
		.select({ id: t.brands.id })
		.from(t.brands)
		.where(eq(t.brands.id, id))
		.limit(1);

	if (!existing) return 'not_found';

	const [products] = await queryDb
		.select({ value: count() })
		.from(t.products)
		.where(eq(t.products.brandId, id));

	if (Number(products?.value ?? 0) > 0) return 'in_use';

	await queryDb.delete(t.brands).where(eq(t.brands.id, id));

	return 'deleted';
}

export async function brandOptions() {
	return queryDb
		.select({ id: t.brands.id, name: t.brands.name })
		.from(t.brands)
		.where(eq(t.brands.status, 'active'))
		.orderBy(asc(t.brands.name));
}
