import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap } from '#shared';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { CreateOrderInput } from '#modules/orders/index.ts';
import type { OrdersService } from '#modules/orders/server.ts';
import type { CommerceReportsService } from '#modules/reporting/server.ts';
import type { ProductVariantFixture, ProductVariantFixtureOptions } from '../support/database.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const DAY = 86_400_000;
const NOW = new Date('2026-02-01T12:00:00.000Z');

export interface ReportsContractContext {
	reports: CommerceReportsService;
	orders: OrdersService;
	catalog: CatalogServices;
	clock: TestClock;
	reset(): Promise<void>;
	createActor(): Promise<string>;
	createProductWithVariant(options?: ProductVariantFixtureOptions): Promise<ProductVariantFixture>;
}

function order(overrides: Partial<CreateOrderInput> & { sku?: string; name?: string } = {}) {
	const { sku = 'W-1', name = 'Widget', ...rest } = overrides;
	const total = rest.grandTotal ?? 3000;
	return {
		userId: 'user-ada',
		status: 'paid',
		paymentStatus: 'paid',
		subtotal: 3000,
		discount: 0,
		shipping: 0,
		tax: 0,
		grandTotal: 3000,
		currency: 'USD',
		couponId: null,
		shippingAddress: {},
		billingAddress: {},
		notes: null,
		items: [
			{
				productId: 'p',
				variantId: 'v',
				productNameSnapshot: name,
				skuSnapshot: sku,
				imageUrlSnapshot: null,
				quantity: 2,
				unitPrice: total / 2,
				total
			}
		],
		payment: { provider: 'mock', status: 'succeeded' },
		...rest
	} satisfies CreateOrderInput;
}

export function runReportsContract(context: ReportsContractContext): void {
	const { reports, orders, catalog, clock, reset } = context;
	const forbidden = createForbiddenActor('user-ada');
	let admin = createAdminActor('pending');

	beforeEach(async () => {
		await reset();
		clock.set(NOW);
		admin = createAdminActor(await context.createActor());
	});

	async function placeAt(daysAgo: number, input: ReturnType<typeof order>) {
		clock.set(new Date(NOW.getTime() - daysAgo * DAY));
		const created = unwrap(await orders.createOrder(input));
		clock.set(NOW);
		return created;
	}

	describe('sales report', () => {
		test('totals revenue from paid orders, buckets days and ranks products', async () => {
			await placeAt(1, order({ grandTotal: 3000 }));
			await placeAt(1, order({ status: 'pending', grandTotal: 1000, sku: 'P-1', name: 'Pending' }));
			await placeAt(0, order({ status: 'shipped', grandTotal: 2000, sku: 'S-1', name: 'Shipped' }));
			await placeAt(60, order({ grandTotal: 9999 }));

			const report = unwrap(await reports.salesReport({}, admin));

			expect(report).toMatchObject({
				to: NOW.toISOString(),
				revenue: 5000,
				orderCount: 3,
				paidOrders: 2,
				averageOrder: 2500,
				statusCounts: { paid: 1, pending: 1, shipped: 1 }
			});
			expect(report.daily).toEqual([
				{ date: '2026-01-31', revenue: 3000, orders: 2 },
				{ date: '2026-02-01', revenue: 2000, orders: 1 }
			]);
			expect(report.topProducts.map((p) => p.sku)).toEqual(['W-1', 'S-1']);
			expect(report.topProducts[0]).toMatchObject({ quantity: 2, total: 3000 });
		});

		test('honours an explicit range and reports an empty window', async () => {
			await placeAt(60, order({ grandTotal: 9999 }));

			const old = unwrap(
				await reports.salesReport(
					{
						from: new Date(NOW.getTime() - 70 * DAY).toISOString(),
						to: new Date(NOW.getTime() - 50 * DAY).toISOString()
					},
					admin
				)
			);
			expect(old).toMatchObject({ revenue: 9999, orderCount: 1 });

			const empty = unwrap(await reports.salesReport({}, admin));
			expect(empty).toMatchObject({
				revenue: 0,
				orderCount: 0,
				averageOrder: 0,
				daily: []
			});
		});
	});

	describe('inventory report', () => {
		test('bands variants by stock and lists the lowest first', async () => {
			const out = await context.createProductWithVariant({
				product: { sku: 'INV-1', slug: 'inv-1' },
				variant: { sku: 'INV-1-V', stock: 0, price: 1000 }
			});
			await context.createProductWithVariant({
				product: { sku: 'INV-2', slug: 'inv-2' },
				variant: { sku: 'INV-2-V', stock: 3, price: 2000 }
			});
			await context.createProductWithVariant({
				product: { sku: 'INV-3', slug: 'inv-3' },
				variant: { sku: 'INV-3-V', stock: 20, price: 100 }
			});
			unwrap(
				await catalog.inventory.adjust(
					{ variantId: out.variantId, delta: 4, reason: 'Restock' },
					admin
				)
			);

			const report = unwrap(await reports.inventoryReport(admin));

			expect(report).toMatchObject({
				variantCount: 3,
				stockValue: 4 * 1000 + 3 * 2000 + 20 * 100,
				outOfStock: 0,
				lowStock: 2,
				bands: { out: 0, low: 2, healthy: 1 }
			});
			expect(report.lowStockVariants.map((v) => v.sku)).toEqual(['INV-2-V', 'INV-1-V']);
			expect(report.recentMovements).toEqual([{ variantId: out.variantId, delta: 4, entries: 1 }]);
		});
	});

	describe('dashboard', () => {
		test('combines orders, catalog and customer figures', async () => {
			await context.createProductWithVariant({
				product: { sku: 'DASH-1', slug: 'dash-1' },
				variant: { sku: 'DASH-1-V', stock: 2 }
			});
			for (let index = 0; index < 6; index += 1) {
				await placeAt(0, order({ grandTotal: 1000 }));
			}
			await placeAt(0, order({ status: 'pending', grandTotal: 500 }));

			const stats = unwrap(await reports.dashboard(admin));

			expect(stats).toMatchObject({
				products: 1,
				orders: 7,
				customers: 3,
				revenue: 6000,
				pendingOrders: 1,
				lowStockVariants: 1
			});
			expect(stats.recentOrders).toHaveLength(5);
			expect(stats.lowStock[0]).toMatchObject({ sku: 'DASH-1-V', stock: 2 });
		});
	});

	test('every report needs admin access', async () => {
		for (const result of [
			await reports.salesReport({}, forbidden),
			await reports.inventoryReport(forbidden),
			await reports.dashboard(forbidden),
			await reports.dashboard(null)
		]) {
			expect(result.ok).toBe(false);
			if (!result.ok) expect([401, 403]).toContain(result.error.status);
		}
	});
}
