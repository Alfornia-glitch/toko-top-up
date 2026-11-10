import { beforeEach, describe, expect, test } from 'vitest';
import type { AppError, Result } from '#shared';
import type { CategoryService } from '#modules/catalog/server.ts';
import type { CategoryWriteInput } from '#modules/catalog/index.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');
const UPDATED = new Date('2026-01-02T03:04:05.000Z');

export interface CategoryContractContext {
	service: CategoryService;
	clock: TestClock;
	reset(): Promise<void>;
	createCategoryProduct(
		categoryId: string,
		status?: 'draft' | 'active' | 'archived'
	): Promise<string>;
}

export function runCategoryContract(context: CategoryContractContext): void {
	const { service, clock, reset, createCategoryProduct } = context;
	const actor = createAdminActor('contract-actor');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	const testService = {
		list: () => service.list(actor),
		create: (input: Parameters<CategoryService['create']>[0]) => service.create(input, actor),
		update: (id: string, input: Parameters<CategoryService['update']>[1]) =>
			service.update(id, input, actor),
		delete: (id: string) => service.delete(id, actor)
	};

	describe('categories contract', () => {
		test('creates a category and lists it with zero products', async () => {
			const created = valueOf(
				await testService.create({
					name: 'Audio',
					position: 0,
					status: 'active'
				})
			);

			expect(created).toMatchObject({
				name: 'Audio',
				slug: 'audio',
				parentId: null,
				description: null,
				imageUrl: null,
				position: 0,
				status: 'active'
			});
			expect(created.createdAt.toISOString()).toBe(START.toISOString());
			expect(created.updatedAt.toISOString()).toBe(START.toISOString());

			const rows = valueOf(await testService.list());
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				id: created.id,
				name: 'Audio',
				slug: 'audio',
				parentName: null,
				productCount: 0
			});
			expect(rows[0].updatedAt.toISOString()).toBe(START.toISOString());
		});

		test('generates unique slugs from duplicate names', async () => {
			const first = valueOf(await testService.create({ name: 'Audio', position: 0 }));
			const second = valueOf(await testService.create({ name: 'Audio', position: 0 }));

			expect(first.slug).toBe('audio');
			expect(second.slug).toBe('audio-2');
		});

		test('normalizes an explicit slug', async () => {
			const created = valueOf(
				await testService.create({
					name: 'Other',
					slug: 'Hello World!',
					position: 0
				})
			);

			expect(created.slug).toBe('hello-world');
		});

		test('de-duplicates an explicit slug', async () => {
			valueOf(await testService.create({ name: 'First', slug: 'audio', position: 0 }));
			const second = valueOf(
				await testService.create({ name: 'Second', slug: 'audio', position: 0 })
			);

			expect(second.slug).toBe('audio-2');
		});

		test('updates fields and timestamps without changing the creation time', async () => {
			const created = valueOf(await testService.create({ name: 'Audio', position: 0 }));
			clock.set(UPDATED);

			const updated = valueOf(
				await testService.update(created.id, {
					name: 'Audio Updated',
					description: 'Updated description',
					imageUrl: 'https://cdn.example.com/audio.png',
					position: 3,
					status: 'inactive'
				})
			);

			expect(updated).toMatchObject({
				id: created.id,
				name: 'Audio Updated',
				slug: 'audio-updated',
				description: 'Updated description',
				imageUrl: 'https://cdn.example.com/audio.png',
				position: 3,
				status: 'inactive'
			});
			expect(updated.createdAt.toISOString()).toBe(START.toISOString());
			expect(updated.updatedAt.toISOString()).toBe(UPDATED.toISOString());
		});

		test('resolves parent names and counts only active products', async () => {
			const parent = valueOf(await testService.create({ name: 'Audio', position: 0 }));
			const child = valueOf(
				await testService.create({
					name: 'Headphones',
					parentId: parent.id,
					position: 0
				})
			);

			await createCategoryProduct(child.id, 'active');
			await createCategoryProduct(child.id, 'archived');

			const rows = valueOf(await testService.list());
			const row = rows.find((entry) => entry.id === child.id);

			expect(row).toMatchObject({
				parentId: parent.id,
				parentName: 'Audio',
				productCount: 1
			});
		});

		test('lists categories by position and name', async () => {
			valueOf(await testService.create({ name: 'Beta', position: 10 }));
			valueOf(await testService.create({ name: 'Alpha', position: 20 }));
			valueOf(await testService.create({ name: 'Gamma', position: 10 }));

			const rows = valueOf(await testService.list());

			expect(rows.map((row) => row.name)).toEqual(['Beta', 'Gamma', 'Alpha']);
		});

		test('reports a missing category on update', async () => {
			const result = await testService.update('missing', {
				name: 'Missing',
				position: 0
			});

			expectError(result, 404, 'Category not found');
		});

		test('reports a missing category on delete', async () => {
			const result = await testService.delete('missing');

			expectError(result, 404, 'Category not found');
		});

		test('rejects a category as its own parent', async () => {
			const created = valueOf(await testService.create({ name: 'Audio', position: 0 }));

			const result = await testService.update(created.id, {
				name: 'Audio',
				parentId: created.id,
				position: 0
			});

			expectError(result, 422, 'A category cannot be its own parent');
		});

		test('rejects a category hierarchy cycle', async () => {
			const parent = valueOf(await testService.create({ name: 'Audio', position: 0 }));
			const child = valueOf(
				await testService.create({
					name: 'Headphones',
					parentId: parent.id,
					position: 0
				})
			);

			const result = await testService.update(parent.id, {
				name: 'Audio',
				parentId: child.id,
				position: 0
			});

			expectError(result, 422, 'Category hierarchy cannot contain a cycle');
		});

		test('refuses to delete a category with child categories', async () => {
			const parent = valueOf(await testService.create({ name: 'Audio', position: 0 }));
			valueOf(
				await testService.create({
					name: 'Headphones',
					parentId: parent.id,
					position: 0
				})
			);

			const result = await testService.delete(parent.id);

			expectError(result, 409, 'Move or delete child categories and products first');
			expect(valueOf(await testService.list())).toHaveLength(2);
		});

		test('refuses to delete a category with products', async () => {
			const created = valueOf(await testService.create({ name: 'Audio', position: 0 }));
			await createCategoryProduct(created.id);

			const result = await testService.delete(created.id);

			expectError(result, 409, 'Move or delete child categories and products first');
			const rows = valueOf(await testService.list());
			expect(rows.map((row) => row.id)).toEqual([created.id]);
			expect(rows[0].productCount).toBe(1);
		});

		test('deletes an unused category', async () => {
			const created = valueOf(await testService.create({ name: 'Audio', position: 0 }));

			const result = await testService.delete(created.id);

			expect(result.ok).toBe(true);
			expect(valueOf(await testService.list())).toEqual([]);
		});

		test('rejects an empty category name', async () => {
			const input = { name: '', position: 0 } as CategoryWriteInput;
			const result = await testService.create(input);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect(result.error.status).toBe(400);
		});

		test('rejects unauthorized category mutations', async () => {
			const result = await service.create({ name: 'Denied', position: 0 }, createForbiddenActor());

			expectError(result, 403, 'Forbidden');
		});
	});
}

function valueOf<T>(result: Result<T, AppError>): T {
	if (!result.ok) throw new Error(result.error.message);
	return result.value;
}

function expectError(result: Result<unknown, AppError>, status: number, message: string): void {
	expect(result.ok).toBe(false);
	if (result.ok) return;
	expect(result.error.status).toBe(status);
	expect(result.error.message).toBe(message);
}
