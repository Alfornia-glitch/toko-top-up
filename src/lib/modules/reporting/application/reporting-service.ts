import {
	assertPermission,
	err,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import type {
	CatalogProductReader,
	CatalogSnapshot,
	CatalogStats,
	ReportedProduct,
	ReportingRepository
} from '../domain/reporting.ts';

export interface ReportingService {
	getStats(actor: Actor): Promise<Result<CatalogStats, AppError>>;
	getSnapshot(actor: Actor): Promise<Result<CatalogSnapshot, AppError>>;
	applyProductEvent(product: ReportedProduct): Promise<void>;
}

export function createReportingService(
	repository: ReportingRepository,
	catalog: CatalogProductReader,
	clock: Clock = systemClock
): ReportingService {
	return {
		async getStats(actor) {
			try {
				assertPermission(actor, 'admin:access');
				return ok(await repository.getStats());
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async getSnapshot(actor) {
			try {
				assertPermission(actor, 'admin:access');
				return ok(await catalog.countByStatus(actor));
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async applyProductEvent(product) {
			await repository.upsertProduct({ ...product, updatedAt: clock.now() });
		}
	};
}
