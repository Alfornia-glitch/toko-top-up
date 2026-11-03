import { asc, count, eq, ne } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from './errors.ts';
import { uniqueSlug } from './slugs.ts';
import type { CategoryWriteInput } from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listCategories() {
	const rows = await queryDb
		.select({
			id: t.categories.id,
			name: t.categories.name,
			slug: t.categories.slug,
			parentId: t.categories.parentId,
			description: t.categories.description,
			imageUrl: t.categories.imageUrl,
			position: t.categories.position,
			status: t.categories.status,
			updatedAt: t.categories.updatedAt
		})
		.from(t.categories)
		.orderBy(asc(t.categories.position), asc(t.categories.name));

	const nameById = new Map<string, string>(
		rows.map((row: { id: string; name: string }) => [row.id, row.name])
	);

	const counts = await queryDb
		.select({ categoryId: t.products.categoryId, value: count() })
		.from(t.products)
		.where(ne(t.products.status, 'archived'))
		.groupBy(t.products.categoryId);

	const countByCategory = new Map<string, number>(
		counts.map((row: { categoryId: string; value: number }) => [
			row.categoryId,
			Number(row.value ?? 0)
		])
	);

	return rows.map((row: { id: string; parentId: string | null }) => ({
		...row,
		parentName: row.parentId ? (nameById.get(row.parentId) ?? null) : null,
		productCount: countByCategory.get(row.id) ?? 0
	}));
}

export async function createCategory(input: CategoryWriteInput) {
	const slug = await uniqueSlug(t.categories, t.categories.slug, input.slug ?? input.name);
	const id = crypto.randomUUID();
	const now = new Date();

	await queryDb.insert(t.categories).values({
		id,
		name: input.name,
		slug,
		parentId: input.parentId ?? null,
		description: input.description ?? null,
		imageUrl: input.imageUrl ?? null,
		position: input.position,
		status: input.status,
		createdAt: now,
		updatedAt: now
	});

	return id;
}

export async function updateCategory(id: string, input: CategoryWriteInput) {
	const [existing] = await queryDb
		.select({ id: t.categories.id })
		.from(t.categories)
		.where(eq(t.categories.id, id))
		.limit(1);

	if (!existing) return false;
	if (input.parentId === id) {
		throw new CatalogError(422, 'A category cannot be its own parent');
	}

	await assertNoCycle(id, input.parentId ?? null);
	const slug = await uniqueSlug(t.categories, t.categories.slug, input.slug ?? input.name, id);

	await queryDb
		.update(t.categories)
		.set({
			name: input.name,
			slug,
			parentId: input.parentId ?? null,
			description: input.description ?? null,
			imageUrl: input.imageUrl ?? null,
			position: input.position,
			status: input.status,
			updatedAt: new Date()
		})
		.where(eq(t.categories.id, id));

	return true;
}

export async function deleteCategory(id: string): Promise<'deleted' | 'not_found' | 'in_use'> {
	const [existing] = await queryDb
		.select({ id: t.categories.id })
		.from(t.categories)
		.where(eq(t.categories.id, id))
		.limit(1);

	if (!existing) return 'not_found';

	const [[children], [products]] = await Promise.all([
		queryDb.select({ value: count() }).from(t.categories).where(eq(t.categories.parentId, id)),
		queryDb.select({ value: count() }).from(t.products).where(eq(t.products.categoryId, id))
	]);

	if (Number(children?.value ?? 0) > 0 || Number(products?.value ?? 0) > 0) {
		return 'in_use';
	}

	await queryDb.delete(t.categories).where(eq(t.categories.id, id));

	return 'deleted';
}

async function assertNoCycle(id: string, parentId: string | null) {
	let current = parentId;

	while (current) {
		if (current === id) {
			throw new CatalogError(422, 'Category hierarchy cannot contain a cycle');
		}

		const [row] = await queryDb
			.select({ parentId: t.categories.parentId })
			.from(t.categories)
			.where(eq(t.categories.id, current))
			.limit(1);

		current = row?.parentId ?? null;
	}
}

export async function categoryOptions() {
	return queryDb
		.select({ id: t.categories.id, name: t.categories.name })
		.from(t.categories)
		.where(eq(t.categories.status, 'active'))
		.orderBy(asc(t.categories.name));
}
