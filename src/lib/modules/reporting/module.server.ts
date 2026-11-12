import { unwrap, type Clock, type EventBus, type EventEnvelope } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { PRODUCT_EVENTS, type CatalogEventMap } from '#modules/catalog/index.ts';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { CustomersServices } from '#modules/customers/server.ts';
import type { OrdersServices } from '#modules/orders/server.ts';
import {
	createCommerceReportsService,
	type CommerceReportsService
} from './application/commerce-reports-service.ts';
import { createReportingService, type ReportingService } from './application/reporting-service.ts';
import type {
	CatalogProductReader,
	CommerceReader,
	CatalogSnapshot,
	ReportedProductStatus
} from './domain/reporting.ts';
import { createPostgresReportingRepository } from './infra/pg/reporting-repository.ts';
import { createSqliteReportingRepository } from './infra/sqlite/reporting-repository.ts';

export interface ReportingServices {
	readonly reporting: ReportingService;
	readonly commerce: CommerceReportsService;
}

type ReportingOptions =
	| {
			provider: 'postgres';
			db: PostgresDb;
			catalog: CatalogServices;
			orders: Pick<OrdersServices, 'orders'>;
			customers: Pick<CustomersServices, 'customers'>;
			eventBus: EventBus;
			clock?: Clock;
	  }
	| {
			provider: 'sqlite';
			db: SqliteDb;
			catalog: CatalogServices;
			orders: Pick<OrdersServices, 'orders'>;
			customers: Pick<CustomersServices, 'customers'>;
			eventBus: EventBus;
			clock?: Clock;
	  };

type ProductEvent = EventEnvelope<CatalogEventMap['catalog.product.created']>;

export function createReportingServices(options: ReportingOptions): ReportingServices {
	const repository =
		options.provider === 'postgres'
			? createPostgresReportingRepository(options.db)
			: createSqliteReportingRepository(options.db);

	const reader: CatalogProductReader = {
		async countByStatus(actor): Promise<CatalogSnapshot> {
			const statuses = ['active', 'draft', 'archived'] as const;
			const results = await Promise.all(
				statuses.map((status) =>
					options.catalog.products.list({ page: 1, pageSize: 1, status }, actor)
				)
			);

			const counts: Record<ReportedProductStatus, number> = { active: 0, draft: 0, archived: 0 };
			for (const [index, result] of results.entries()) {
				if (!result.ok) throw result.error;
				const status = statuses[index];
				if (status) counts[status] = result.value.total;
			}

			return {
				total: counts.active + counts.draft + counts.archived,
				active: counts.active,
				draft: counts.draft,
				archived: counts.archived
			};
		}
	};

	const commerceReader: CommerceReader = {
		async salesData(range, topLimit, actor) {
			return unwrap(await options.orders.orders.getSalesData(range, topLimit, actor));
		},
		async orderTotals(actor) {
			return unwrap(await options.orders.orders.getTotals(actor));
		},
		async recentOrders(limit, actor) {
			const page = unwrap(
				await options.orders.orders.listOrders(
					{ page: 1, pageSize: limit, sort: '-placedAt' },
					actor
				)
			);
			return page.data.map((order) => ({
				id: order.id,
				orderNumber: order.orderNumber,
				status: order.status,
				paymentStatus: order.paymentStatus,
				grandTotalCents: order.grandTotalCents,
				currency: order.currency,
				placedAt: order.placedAt
			}));
		},
		async inventoryData(actor) {
			return unwrap(await options.catalog.inventory.getReportData(actor));
		},
		async productCount(actor) {
			return unwrap(await options.catalog.products.list({ page: 1, pageSize: 1 }, actor)).total;
		},
		async customerCount(actor) {
			return unwrap(
				await options.customers.customers.listCustomers({ page: 1, pageSize: 1 }, actor)
			).total;
		}
	};

	const reporting = createReportingService(repository, reader, options.clock);
	const commerce = createCommerceReportsService(commerceReader, options.clock);

	subscribeReportingEvents(options.eventBus, reporting);

	return { reporting, commerce };
}

export function subscribeReportingEvents(eventBus: EventBus, reporting: ReportingService): void {
	async function applyProductEvent(event: ProductEvent): Promise<void> {
		await reporting.applyProductEvent({
			productId: event.payload.productId,
			sku: event.payload.sku,
			status: event.payload.status,
			updatedAt: new Date(event.occurredAt)
		});
	}

	eventBus.subscribe(PRODUCT_EVENTS.created, applyProductEvent);
	eventBus.subscribe(PRODUCT_EVENTS.updated, applyProductEvent);
	eventBus.subscribe(PRODUCT_EVENTS.statusChanged, applyProductEvent);
}
