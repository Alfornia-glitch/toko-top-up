import { beforeEach, describe, expect, test } from 'vitest';
import type { AppError, Result } from '#shared';
import type { InventoryService } from '#modules/catalog/server.ts';
import type { StockAdjustInput } from '#modules/catalog/index.ts';
import type {
	ProductVariantFixture,
	ProductVariantFixtureOptions,
	VariantFixtureOptions
} from '../support/database.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');
const UPDATED = new Date('2026-01-02T03:04:05.000Z');

export interface InventoryContractContext {
	service: InventoryService;
	clock: TestClock;
	reset(): Promise<void>;
	createActor(): Promise<string>;
	createProductWithVariant(options?: ProductVariantFixtureOptions): Promise<ProductVariantFixture>;
	createVariant(productId: string, options?: VariantFixtureOptions): Promise<string>;
}

export function runInventoryContract(context: InventoryContractContext): void {
	const { service, clock, reset, createActor, createProductWithVariant, createVariant } = context;
	let actorId = '';
	let actor = createAdminActor('pending');

	beforeEach(async () => {
		await reset();
		clock.set(START);
		actorId = await createActor();
		actor = createAdminActor(actorId);
	});

	const testService = {
		list: (query: Parameters<InventoryService['list']>[0]) => service.list(query, actor),
		listMovements: (query: Parameters<InventoryService['listMovements']>[0]) =>
			service.listMovements(query, actor),
		adjust: (input: Parameters<InventoryService['adjust']>[0], _legacyActorId?: string) =>
			service.adjust(input, actor)
	};

	describe('inventory contract', () => {
		test('lists variants with product data, filters and ordering', async () => {
			const first = await createProductWithVariant({
				product: { name: 'Widget', sku: 'WIDGET-1', status: 'active' },
				variant: { name: 'Zeta', sku: 'WIDGET-1-Z', stock: 8 }
			});

			const alphaId = await createVariant(first.productId, {
				name: 'Alpha',
				sku: 'WIDGET-1-A',
				stock: 3
			});

			await createProductWithVariant({
				product: { name: 'Gadget', sku: 'GADGET-1', status: 'active' },
				variant: { name: 'Other', sku: 'GADGET-1-O', stock: 20 }
			});

			const result = valueOf(
				await testService.list({ page: 1, pageSize: 25, q: 'Widget', lowStock: false })
			);

			expect(result.total).toBe(2);
			expect(result.data.map((row) => row.name)).toEqual(['Alpha', 'Zeta']);
			expect(result.data[0]).toMatchObject({
				id: alphaId,
				sku: 'WIDGET-1-A',
				stock: 3,
				status: 'active',
				productId: first.productId,
				productName: 'Widget',
				productSku: 'WIDGET-1'
			});

			const lowStock = valueOf(
				await testService.list({ page: 1, pageSize: 25, q: 'Widget', lowStock: true })
			);
			expect(lowStock.data.map((row) => row.name)).toEqual(['Alpha']);

			const byVariant = valueOf(
				await testService.list({ page: 1, pageSize: 25, variantId: alphaId, lowStock: false })
			);
			expect(byVariant.total).toBe(1);
			expect(byVariant.data[0].id).toBe(alphaId);
		});

		test('paginates inventory variants', async () => {
			const product = await createProductWithVariant({
				product: { name: 'Paged product', sku: 'PAGED-1' },
				variant: { name: 'A', sku: 'PAGED-1-A', stock: 1 }
			});
			await createVariant(product.productId, { name: 'B', sku: 'PAGED-1-B', stock: 2 });
			await createVariant(product.productId, { name: 'C', sku: 'PAGED-1-C', stock: 3 });

			const page = valueOf(
				await testService.list({ page: 2, pageSize: 1, q: 'Paged', lowStock: false })
			);

			expect(page.total).toBe(3);
			expect(page.page).toBe(2);
			expect(page.pageSize).toBe(1);
			expect(page.data.map((row) => row.name)).toEqual(['B']);
		});

		test('adjusts stock and records movements', async () => {
			const fixture = await createProductWithVariant({
				product: { name: 'Stocked product', sku: 'STOCK-1' },
				variant: { name: 'Default', sku: 'STOCK-1-A', stock: 10 }
			});

			const increased = valueOf(
				await testService.adjust(
					{
						variantId: fixture.variantId,
						delta: 5,
						reason: 'Stock received',
						referenceType: 'purchase_order',
						referenceId: 'PO-1'
					},
					actorId
				)
			);

			expect(increased).toMatchObject({
				id: fixture.variantId,
				sku: 'STOCK-1-A',
				name: 'Default',
				stock: 15
			});
			expect(increased.movementId).toBeTruthy();

			clock.set(UPDATED);

			const decreased = valueOf(
				await testService.adjust(
					{ variantId: fixture.variantId, delta: -3, reason: 'Damaged' },
					actorId
				)
			);
			expect(decreased.stock).toBe(12);

			const variants = valueOf(
				await testService.list({
					page: 1,
					pageSize: 25,
					variantId: fixture.variantId,
					lowStock: false
				})
			);
			expect(variants.data[0].stock).toBe(12);

			const movements = valueOf(
				await testService.listMovements({
					page: 1,
					pageSize: 25,
					variantId: fixture.variantId
				})
			);

			expect(movements.total).toBe(2);
			expect(movements.data.map((row) => row.delta)).toEqual([-3, 5]);
			expect(movements.data[1]).toMatchObject({
				variantId: fixture.variantId,
				reason: 'Stock received',
				referenceType: 'purchase_order',
				referenceId: 'PO-1',
				variantName: 'Default',
				variantSku: 'STOCK-1-A',
				productName: 'Stocked product'
			});
			expect(movements.data[1].createdAt.toISOString()).toBe(START.toISOString());
			expect(movements.data[0].createdAt.toISOString()).toBe(UPDATED.toISOString());
		});

		test('reports a missing variant', async () => {
			const result = await testService.adjust(
				{ variantId: 'missing', delta: 1, reason: 'Restock' },
				actorId
			);

			expectError(result, 404, 'Variant not found');
		});

		test('refuses to reduce stock below zero without side effects', async () => {
			const fixture = await createProductWithVariant({
				product: { name: 'Low stock', sku: 'LOW-1' },
				variant: { name: 'Default', sku: 'LOW-1-A', stock: 2 }
			});

			const result = await testService.adjust(
				{ variantId: fixture.variantId, delta: -3, reason: 'Shrinkage' },
				actorId
			);

			expectError(result, 409, 'Stock cannot go below zero (current: 2)');

			const variants = valueOf(
				await testService.list({
					page: 1,
					pageSize: 25,
					variantId: fixture.variantId,
					lowStock: false
				})
			);
			expect(variants.data[0].stock).toBe(2);

			const movements = valueOf(
				await testService.listMovements({
					page: 1,
					pageSize: 25,
					variantId: fixture.variantId
				})
			);
			expect(movements.total).toBe(0);
		});

		test('rejects a zero delta', async () => {
			const fixture = await createProductWithVariant({
				product: { name: 'Zero', sku: 'ZERO-1' },
				variant: { name: 'Default', sku: 'ZERO-1-A', stock: 1 }
			});

			const input = {
				variantId: fixture.variantId,
				delta: 0,
				reason: 'No change'
			} as StockAdjustInput;
			const result = await testService.adjust(input, actorId);

			expect(result.ok).toBe(false);
			if (result.ok) return;
			expect(result.error.code).toBe('VALIDATION_ERROR');
			expect(result.error.status).toBe(400);
		});

		test('filters and paginates stock movements', async () => {
			const first = await createProductWithVariant({
				product: { name: 'Movement product', sku: 'MOVE-1' },
				variant: { name: 'First', sku: 'MOVE-1-A', stock: 10 }
			});
			const secondId = await createVariant(first.productId, {
				name: 'Second',
				sku: 'MOVE-1-B',
				stock: 10
			});

			valueOf(
				await testService.adjust({ variantId: first.variantId, delta: 1, reason: 'First' }, actorId)
			);
			clock.set(UPDATED);
			valueOf(
				await testService.adjust({ variantId: secondId, delta: 2, reason: 'Second' }, actorId)
			);

			const filtered = valueOf(
				await testService.listMovements({
					page: 1,
					pageSize: 25,
					variantId: secondId
				})
			);
			expect(filtered.total).toBe(1);
			expect(filtered.data[0]).toMatchObject({
				variantId: secondId,
				delta: 2,
				reason: 'Second'
			});

			const paged = valueOf(await testService.listMovements({ page: 2, pageSize: 1 }));
			expect(paged.total).toBe(2);
			expect(paged.data).toHaveLength(1);
			expect(paged.data[0].reason).toBe('First');
		});

		test('rejects unauthorized stock adjustments', async () => {
			const fixture = await createProductWithVariant({
				product: { name: 'Denied product', sku: 'DENIED-1' },
				variant: { name: 'Default', sku: 'DENIED-1-A', stock: 1 }
			});

			const result = await service.adjust(
				{ variantId: fixture.variantId, delta: 1, reason: 'Denied' },
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
