import { beforeEach, describe, expect, test } from 'vitest';
import type { AppError, Result } from '#shared';
import type { ProductService } from '#modules/catalog/server.ts';
import type { ProductDetail, ProductWriteInput } from '#modules/catalog/index.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');
const UPDATED = new Date('2026-01-02T03:04:05.000Z');

export interface ProductContractContext {
	service: ProductService;
	clock: TestClock;
	reset(): Promise<void>;
	createActor(): Promise<string>;
	createBrand(name?: string): Promise<string>;
	createCategory(name?: string): Promise<string>;
}

export function runProductContract(context: ProductContractContext): void {
	const { service, clock, reset, createActor, createBrand, createCategory } = context;
	let actorId = '';
	let actor = createAdminActor('pending');

	beforeEach(async () => {
		await reset();
		clock.set(START);
		actorId = await createActor();
		actor = createAdminActor(actorId);
	});

	const testService = {
		list: (query: Parameters<ProductService['list']>[0]) => service.list(query, actor),
		get: (id: string) => service.get(id, actor),
		create: (input: Parameters<ProductService['create']>[0], _legacyActorId?: string) =>
			service.create(input, actor),
		update: (id: string, input: Parameters<ProductService['update']>[1]) =>
			service.update(id, input, actor),
		setStatus: (id: string, status: Parameters<ProductService['setStatus']>[1]) =>
			service.setStatus(id, status, actor)
	};

	describe('products contract', () => {
		test('creates a product with nested records', async () => {
			const brandId = await createBrand('Acme');
			const categoryId = await createCategory('Audio');

			const created = valueOf(
				await testService.create(
					{
						sku: 'AUD-001',
						name: 'Wireless Headphones',
						brandId,
						categoryId,
						status: 'active',
						priceCents: 12999,
						compareAtPriceCents: 14999,
						isFeatured: true,
						images: [
							{ url: 'https://cdn.example.com/second.png', position: 2 },
							{ url: 'https://cdn.example.com/first.png', position: 1 }
						],
						options: [
							{
								name: 'Color',
								position: 0,
								values: [
									{ value: 'Black', position: 1 },
									{ value: 'White', position: 0 }
								]
							}
						],
						variants: [
							{
								sku: 'AUD-001-BLK',
								name: 'Black',
								priceCents: 12999,
								stock: 4,
								optionValuesJson: { Color: 'Black' }
							}
						]
					},
					actorId
				)
			);

			expect(created).toMatchObject({
				sku: 'AUD-001',
				name: 'Wireless Headphones',
				slug: 'wireless-headphones',
				brandId,
				categoryId,
				brandName: 'Acme',
				categoryName: 'Audio',
				status: 'active',
				priceCents: 12999,
				compareAtPriceCents: 14999,
				currency: 'USD',
				isFeatured: true,
				isNewArrival: false,
				isDeal: false
			});
			expect(created.createdAt.toISOString()).toBe(START.toISOString());
			expect(created.updatedAt.toISOString()).toBe(START.toISOString());
			expect(created.images.map((image) => image.url)).toEqual([
				'https://cdn.example.com/first.png',
				'https://cdn.example.com/second.png'
			]);
			expect(created.options).toHaveLength(1);
			expect(created.options[0]).toMatchObject({ name: 'Color', position: 0 });
			expect(created.options[0].values.map((value) => value.value)).toEqual(['White', 'Black']);
			expect(created.variants).toHaveLength(1);
			expect(created.variants[0]).toMatchObject({
				sku: 'AUD-001-BLK',
				name: 'Black',
				stock: 4,
				status: 'active',
				optionValuesJson: { Color: 'Black' }
			});
		});

		test('applies defaults for a minimal product', async () => {
			const created = valueOf(
				await testService.create({ sku: 'MIN-001', name: 'Minimal', priceCents: 100 }, actorId)
			);

			expect(created).toMatchObject({
				status: 'draft',
				currency: 'USD',
				brandId: null,
				categoryId: null,
				isFeatured: false,
				isNewArrival: false,
				isDeal: false,
				dealEndsAt: null,
				specsJson: null,
				shippingInfo: null,
				returnPolicy: null
			});
			expect(created.images).toEqual([]);
			expect(created.options).toEqual([]);
			expect(created.variants).toEqual([]);
		});

		test('generates unique slugs from duplicate names', async () => {
			const first = valueOf(
				await testService.create({ sku: 'DUP-1', name: 'Audio', priceCents: 100 }, actorId)
			);
			const second = valueOf(
				await testService.create({ sku: 'DUP-2', name: 'Audio', priceCents: 100 }, actorId)
			);

			expect(first.slug).toBe('audio');
			expect(second.slug).toBe('audio-2');
		});

		test('normalizes and de-duplicates an explicit slug', async () => {
			valueOf(
				await testService.create(
					{ sku: 'SLUG-1', name: 'First', slug: 'Hello World!', priceCents: 100 },
					actorId
				)
			);
			const second = valueOf(
				await testService.create(
					{ sku: 'SLUG-2', name: 'Second', slug: 'Hello World!', priceCents: 100 },
					actorId
				)
			);

			expect(second.slug).toBe('hello-world-2');
		});

		test('rejects a duplicate product SKU', async () => {
			valueOf(await testService.create({ sku: 'SKU-1', name: 'First', priceCents: 100 }, actorId));

			const result = await testService.create(
				{ sku: 'SKU-1', name: 'Second', priceCents: 100 },
				actorId
			);

			expectError(result, 409, 'SKU "SKU-1" is already in use');
		});

		test('lists products with filters, enrichment and totals', async () => {
			const brandId = await createBrand('Acme');
			const categoryId = await createCategory('Audio');

			valueOf(
				await testService.create(
					{
						sku: 'LIST-1',
						name: 'Wireless Headphones',
						brandId,
						categoryId,
						status: 'active',
						priceCents: 5000,
						images: [{ url: 'https://cdn.example.com/primary.png', position: 0 }],
						variants: [
							{ sku: 'LIST-1-A', name: 'A', priceCents: 5000, stock: 2 },
							{ sku: 'LIST-1-B', name: 'B', priceCents: 5000, stock: 3 }
						]
					},
					actorId
				)
			);

			valueOf(
				await testService.create(
					{
						sku: 'LIST-2',
						name: 'Wireless Speaker',
						brandId,
						categoryId,
						status: 'draft',
						priceCents: 3000
					},
					actorId
				)
			);

			const result = valueOf(
				await testService.list({
					page: 1,
					pageSize: 25,
					q: 'Wireless',
					status: 'active',
					categoryId,
					brandId
				})
			);

			expect(result.total).toBe(1);
			expect(result.page).toBe(1);
			expect(result.pageSize).toBe(25);
			expect(result.data).toHaveLength(1);
			expect(result.data[0]).toMatchObject({
				sku: 'LIST-1',
				name: 'Wireless Headphones',
				brandName: 'Acme',
				categoryName: 'Audio',
				imageUrl: 'https://cdn.example.com/primary.png',
				stock: 5
			});
		});

		test('sorts and paginates products', async () => {
			valueOf(await testService.create({ sku: 'SORT-1', name: 'Beta', priceCents: 300 }, actorId));
			valueOf(await testService.create({ sku: 'SORT-2', name: 'Alpha', priceCents: 100 }, actorId));
			valueOf(await testService.create({ sku: 'SORT-3', name: 'Gamma', priceCents: 200 }, actorId));

			const byPrice = valueOf(await testService.list({ page: 1, pageSize: 25, sort: 'price' }));
			expect(byPrice.data.map((row) => row.name)).toEqual(['Alpha', 'Gamma', 'Beta']);

			const byNameDesc = valueOf(await testService.list({ page: 1, pageSize: 25, sort: '-name' }));
			expect(byNameDesc.data.map((row) => row.name)).toEqual(['Gamma', 'Beta', 'Alpha']);

			const secondPage = valueOf(await testService.list({ page: 2, pageSize: 1, sort: 'price' }));
			expect(secondPage.total).toBe(3);
			expect(secondPage.data.map((row) => row.name)).toEqual(['Gamma']);
		});

		test('sorts by updated time by default', async () => {
			valueOf(await testService.create({ sku: 'TIME-1', name: 'Older', priceCents: 100 }, actorId));
			clock.set(UPDATED);
			valueOf(await testService.create({ sku: 'TIME-2', name: 'Newer', priceCents: 100 }, actorId));

			const result = valueOf(await testService.list({ page: 1, pageSize: 25 }));

			expect(result.data.map((row) => row.name)).toEqual(['Newer', 'Older']);
		});

		test('reports a missing product', async () => {
			const result = await testService.get('missing');

			expectError(result, 404, 'Product not found');
		});

		test('reports a missing product on update', async () => {
			const result = await testService.update('missing', {
				sku: 'MISS-1',
				name: 'Missing',
				priceCents: 100
			});

			expectError(result, 404, 'Product not found');
		});

		test('updates nested records and preserves variant history', async () => {
			const created = valueOf(
				await testService.create(
					{
						sku: 'EDIT-1',
						name: 'Original',
						priceCents: 1000,
						images: [{ url: 'https://cdn.example.com/old.png', position: 0 }],
						options: [
							{
								name: 'Size',
								position: 0,
								values: [
									{ value: 'S', position: 0 },
									{ value: 'M', position: 1 }
								]
							}
						],
						variants: [
							{ sku: 'EDIT-1-S', name: 'Small', priceCents: 1000, stock: 2 },
							{ sku: 'EDIT-1-M', name: 'Medium', priceCents: 1000, stock: 3 }
						]
					},
					actorId
				)
			);
			const kept = created.variants.find((variant) => variant.sku === 'EDIT-1-S');
			const removed = created.variants.find((variant) => variant.sku === 'EDIT-1-M');

			expect(kept).toBeDefined();
			expect(removed).toBeDefined();

			clock.set(UPDATED);

			const updated = valueOf(
				await testService.update(created.id, {
					sku: 'EDIT-1',
					name: 'Updated',
					priceCents: 1500,
					description: 'Updated description',
					status: 'active',
					images: [{ url: 'https://cdn.example.com/new.png', position: 0 }],
					options: [
						{
							name: 'Color',
							position: 0,
							values: [{ value: 'Black', position: 0 }]
						}
					],
					variants: [
						{
							id: kept?.id,
							sku: 'EDIT-1-S',
							name: 'Small Updated',
							priceCents: 1500,
							stock: 6
						},
						{ sku: 'EDIT-1-L', name: 'Large', priceCents: 1500, stock: 4 }
					]
				})
			);

			expect(updated).toMatchObject({
				id: created.id,
				name: 'Updated',
				slug: 'updated',
				priceCents: 1500,
				description: 'Updated description',
				status: 'active'
			});
			expect(updated.createdAt.toISOString()).toBe(START.toISOString());
			expect(updated.updatedAt.toISOString()).toBe(UPDATED.toISOString());
			expect(updated.images.map((image) => image.url)).toEqual(['https://cdn.example.com/new.png']);
			expect(updated.options).toHaveLength(1);
			expect(updated.options[0].name).toBe('Color');
			expect(updated.options[0].values.map((value) => value.value)).toEqual(['Black']);
			expect(updated.variants).toHaveLength(3);
			expect(updated.variants.find((variant) => variant.id === kept?.id)).toMatchObject({
				name: 'Small Updated',
				stock: 6
			});
			expect(updated.variants.find((variant) => variant.id === removed?.id)).toMatchObject({
				status: 'inactive',
				stock: 0
			});
			expect(updated.variants.find((variant) => variant.sku === 'EDIT-1-L')).toBeDefined();
		});

		test('checks SKU uniqueness on update while allowing the current SKU', async () => {
			const first = valueOf(
				await testService.create({ sku: 'UNIQ-1', name: 'First', priceCents: 100 }, actorId)
			);
			const second = valueOf(
				await testService.create({ sku: 'UNIQ-2', name: 'Second', priceCents: 100 }, actorId)
			);

			const ownSku = await testService.update(first.id, {
				sku: 'UNIQ-1',
				name: 'First Updated',
				priceCents: 100
			});
			expect(ownSku.ok).toBe(true);

			const result = await testService.update(second.id, {
				sku: 'UNIQ-1',
				name: 'Second',
				priceCents: 100
			});
			expectError(result, 409, 'SKU "UNIQ-1" is already in use');
		});

		test('updates only the status', async () => {
			const created = valueOf(
				await testService.create({ sku: 'STAT-1', name: 'Status', priceCents: 100 }, actorId)
			);
			clock.set(UPDATED);

			const updated = valueOf(await testService.setStatus(created.id, 'archived'));

			expect(updated.status).toBe('archived');
			expect(updated.createdAt.toISOString()).toBe(START.toISOString());
			expect(updated.updatedAt.toISOString()).toBe(UPDATED.toISOString());

			const result = await testService.setStatus('missing', 'active');
			expectError(result, 404, 'Product not found');
		});

		test('rejects invalid product data', async () => {
			const input = { sku: 'BAD-1', name: '', priceCents: 100 } as ProductWriteInput;
			const result = await testService.create(input, actorId);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect(result.error.status).toBe(400);
		});

		test('rejects unauthorized product mutations', async () => {
			const result = await service.create(
				{ sku: 'DENIED-1', name: 'Denied', priceCents: 100 },
				createForbiddenActor()
			);

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
