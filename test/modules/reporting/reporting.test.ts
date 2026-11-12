// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { createEvent, createEventBus } from '#shared';
import { PRODUCT_EVENTS } from '#modules/catalog/index.ts';
import { createReportingService, subscribeReportingEvents } from '#modules/reporting/server.ts';
import type {
	CatalogSnapshot,
	ReportedProduct,
	ReportingRepository
} from '#modules/reporting/server.ts';
import { createAdminActor } from '../../contracts/support/actor.ts';

function createMemoryRepository(): ReportingRepository {
	const products = new Map<string, ReportedProduct>();

	return {
		async upsertProduct(product) {
			products.set(product.productId, product);
		},
		async getStats() {
			const byStatus = [...products.values()].reduce<Record<string, number>>((counts, product) => {
				counts[product.status] = (counts[product.status] ?? 0) + 1;
				return counts;
			}, {});

			return {
				total: products.size,
				byStatus: Object.entries(byStatus).map(([status, count]) => ({
					status: status as ReportedProduct['status'],
					count
				})),
				updatedAt: null
			};
		}
	};
}

const actor = createAdminActor('reporting-test-actor');
const snapshot: CatalogSnapshot = { total: 8, active: 5, draft: 2, archived: 1 };

describe('reporting', () => {
	test('reads catalog through its public API', async () => {
		const service = createReportingService(createMemoryRepository(), {
			async countByStatus() {
				return snapshot;
			}
		});

		const result = await service.getSnapshot(actor);

		expect(result).toEqual({ ok: true, value: snapshot });
	});

	test('maintains an event-fed read model', async () => {
		const bus = createEventBus();
		const repository = createMemoryRepository();
		const service = createReportingService(repository, {
			async countByStatus() {
				return { total: 0, active: 0, draft: 0, archived: 0 };
			}
		});

		subscribeReportingEvents(bus, service);

		await bus.publish(
			createEvent(PRODUCT_EVENTS.created, {
				productId: 'product-1',
				sku: 'SKU-1',
				status: 'draft'
			})
		);
		await bus.publish(
			createEvent(PRODUCT_EVENTS.statusChanged, {
				productId: 'product-1',
				sku: 'SKU-1',
				status: 'active'
			})
		);

		const result = await service.getStats(actor);

		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.value.total).toBe(1);
		expect(result.value.byStatus).toEqual([{ status: 'active', count: 1 }]);
	});

	test('isolates failing subscribers', async () => {
		const bus = createEventBus();
		const repository = createMemoryRepository();
		const service = createReportingService(repository, {
			async countByStatus() {
				return snapshot;
			}
		});

		bus.subscribe(PRODUCT_EVENTS.created, () => {
			throw new Error('subscriber failed');
		});
		subscribeReportingEvents(bus, service);

		await bus.publish(
			createEvent(PRODUCT_EVENTS.created, {
				productId: 'product-2',
				sku: 'SKU-2',
				status: 'draft'
			})
		);

		const result = await service.getStats(actor);
		expect(result.ok && result.value.total).toBe(1);
	});
});
