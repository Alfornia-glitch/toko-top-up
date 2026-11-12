import type { Clock, EventBus, EventEnvelope } from '#shared';
import type { PostgresDb, SqliteDb } from '#db/core.ts';
import { PRODUCT_EVENTS, type CatalogEventMap } from '#modules/catalog/index.ts';
import type { CatalogServices } from '#modules/catalog/server.ts';
import { createReportingService, type ReportingService } from './application/reporting-service.ts';
import type {
	CatalogProductReader,
	CatalogSnapshot,
	ReportedProductStatus
} from './domain/reporting.ts';
import { createPostgresReportingRepository } from './infra/pg/reporting-repository.ts';
import { createSqliteReportingRepository } from './infra/sqlite/reporting-repository.ts';

export interface ReportingServices {
	readonly reporting: ReportingService;
}

type ReportingOptions =
	| {
			provider: 'postgres';
			db: PostgresDb;
			catalog: CatalogServices;
			eventBus: EventBus;
			clock?: Clock;
	  }
	| {
			provider: 'sqlite';
			db: SqliteDb;
			catalog: CatalogServices;
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

	const reporting = createReportingService(repository, reader, options.clock);

	subscribeReportingEvents(options.eventBus, reporting);

	return { reporting };
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
