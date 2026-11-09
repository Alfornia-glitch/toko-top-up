import { beforeEach, describe, expect, test } from 'vitest';
import type { AppError, Result } from '#shared';
import type { BrandService } from '#modules/catalog/server.ts';
import type { BrandWriteInput } from '#modules/catalog/index.ts';
import type { TestClock } from '../support/clock.ts';

const START = new Date('2026-01-01T00:00:00.000Z');
const UPDATED = new Date('2026-01-02T03:04:05.000Z');

export interface BrandContractContext {
	service: BrandService;
	clock: TestClock;
	reset(): Promise<void>;
	createProduct(brandId: string): Promise<string>;
}

export function runBrandContract(context: BrandContractContext): void {
	const { service, clock, reset, createProduct } = context;

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	describe('brands contract', () => {
		test('creates a brand and lists it with zero products', async () => {
			const created = valueOf(
				await service.create({
					name: 'Acme',
					status: 'active'
				})
			);

			expect(created).toMatchObject({
				name: 'Acme',
				slug: 'acme',
				logoUrl: null,
				description: null,
				status: 'active'
			});
			expect(created.createdAt.toISOString()).toBe(START.toISOString());
			expect(created.updatedAt.toISOString()).toBe(START.toISOString());

			const rows = valueOf(await service.list());
			expect(rows).toHaveLength(1);
			expect(rows[0]).toMatchObject({
				id: created.id,
				name: 'Acme',
				slug: 'acme',
				productCount: 0
			});
			expect(rows[0].updatedAt.toISOString()).toBe(START.toISOString());
		});

		test('generates unique slugs from duplicate names', async () => {
			const first = valueOf(await service.create({ name: 'Acme', status: 'active' }));
			const second = valueOf(await service.create({ name: 'Acme', status: 'active' }));

			expect(first.slug).toBe('acme');
			expect(second.slug).toBe('acme-2');
		});

		test('normalizes an explicit slug', async () => {
			const created = valueOf(
				await service.create({
					name: 'Other',
					slug: 'Hello World!',
					status: 'active'
				})
			);

			expect(created.slug).toBe('hello-world');
		});

		test('de-duplicates an explicit slug', async () => {
			const first = valueOf(
				await service.create({ name: 'First', slug: 'acme', status: 'active' })
			);
			const second = valueOf(
				await service.create({ name: 'Second', slug: 'acme', status: 'active' })
			);

			expect(first.slug).toBe('acme');
			expect(second.slug).toBe('acme-2');
		});

		test('updates fields and timestamps without changing the creation time', async () => {
			const created = valueOf(await service.create({ name: 'Acme', status: 'active' }));
			clock.set(UPDATED);

			const updated = valueOf(
				await service.update(created.id, {
					name: 'Acme Updated',
					status: 'inactive',
					logoUrl: 'https://cdn.example.com/acme.png',
					description: 'Updated description'
				})
			);

			expect(updated).toMatchObject({
				id: created.id,
				name: 'Acme Updated',
				slug: 'acme-updated',
				status: 'inactive',
				logoUrl: 'https://cdn.example.com/acme.png',
				description: 'Updated description'
			});
			expect(updated.createdAt.toISOString()).toBe(START.toISOString());
			expect(updated.updatedAt.toISOString()).toBe(UPDATED.toISOString());
		});

		test('reports a missing brand on update', async () => {
			const result = await service.update('missing', {
				name: 'Missing',
				status: 'active'
			});

			expectError(result, 404, 'Brand not found');
		});

		test('reports a missing brand on delete', async () => {
			const result = await service.delete('missing');

			expectError(result, 404, 'Brand not found');
		});

		test('refuses to delete a brand that is used by a product', async () => {
			const created = valueOf(await service.create({ name: 'Acme', status: 'active' }));
			await createProduct(created.id);

			const result = await service.delete(created.id);

			expectError(result, 409, 'Reassign or delete products that use this brand first');

			const rows = valueOf(await service.list());
			expect(rows.map((row) => row.id)).toEqual([created.id]);
			expect(rows[0].productCount).toBe(1);
		});

		test('deletes an unused brand', async () => {
			const created = valueOf(await service.create({ name: 'Acme', status: 'active' }));

			const result = await service.delete(created.id);

			expect(result.ok).toBe(true);
			expect(valueOf(await service.list())).toEqual([]);
		});

		test('lists only active brands as options in name order', async () => {
			valueOf(await service.create({ name: 'Zeta', status: 'active' }));
			valueOf(await service.create({ name: 'alpha', status: 'active' }));
			valueOf(await service.create({ name: 'Beta', status: 'inactive' }));

			const options = valueOf(await service.listOptions());

			expect(options.map((option) => option.name)).toEqual(['alpha', 'Zeta']);
		});

		test('lists brands in name order with product counts', async () => {
			const beta = valueOf(await service.create({ name: 'Beta', status: 'active' }));
			valueOf(await service.create({ name: 'alpha', status: 'active' }));
			await createProduct(beta.id);

			const rows = valueOf(await service.list());

			expect(rows.map((row) => row.name)).toEqual(['alpha', 'Beta']);
			expect(rows.find((row) => row.id === beta.id)?.productCount).toBe(1);
			expect(rows.find((row) => row.name === 'alpha')?.productCount).toBe(0);
		});

		test('rejects an empty brand name', async () => {
			const input = { name: '', status: 'active' } as BrandWriteInput;
			const result = await service.create(input);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect(result.error.status).toBe(400);
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
