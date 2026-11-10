import {
	ConflictError,
	NotFoundError,
	ValidationError,
	assertPermission,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	stockAdjustSchema,
	type InventoryListQuery,
	type InventoryListResult,
	type MovementListQuery,
	type MovementListResult,
	type StockAdjustInput,
	type StockAdjustment
} from '../domain/inventory.ts';
import type { InventoryRepository } from './inventory-repository.ts';

export interface InventoryService {
	list(query: InventoryListQuery, actor: Actor): Promise<Result<InventoryListResult, AppError>>;
	listMovements(
		query: MovementListQuery,
		actor: Actor
	): Promise<Result<MovementListResult, AppError>>;
	adjust(input: StockAdjustInput, actor: Actor): Promise<Result<StockAdjustment, AppError>>;
}

export function createInventoryService(
	repository: InventoryRepository,
	clock: Clock = systemClock
): InventoryService {
	return {
		async list(query, actor) {
			try {
				assertPermission(actor, 'catalog:inventory:read');
				const result = await repository.listVariants(query);
				return ok({
					data: result.data,
					page: query.page,
					pageSize: query.pageSize,
					total: result.total
				});
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async listMovements(query, actor) {
			try {
				assertPermission(actor, 'catalog:inventory:read');
				const result = await repository.listMovements(query);
				return ok({
					data: result.data,
					page: query.page,
					pageSize: query.pageSize,
					total: result.total
				});
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async adjust(input, actor) {
			try {
				const current = assertPermission(actor, 'catalog:inventory:write');
				const parsed = stockAdjustSchema.safeParse(input);
				if (!parsed.success) {
					return err(
						new ValidationError('Invalid stock adjustment', {
							details: parsed.error.flatten()
						})
					);
				}

				const outcome = await repository.adjustStock(parsed.data, {
					movementId: newId(),
					actorId: current.id,
					now: clock.now()
				});

				if (outcome.kind === 'not_found') {
					return err(new NotFoundError('Variant not found'));
				}

				if (outcome.kind === 'negative') {
					return err(
						new ConflictError(`Stock cannot go below zero (current: ${outcome.currentStock})`)
					);
				}

				return ok(outcome.adjustment);
			} catch (error) {
				return err(toAppError(error));
			}
		}
	};
}
