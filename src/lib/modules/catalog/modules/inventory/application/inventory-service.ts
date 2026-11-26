import {
	ConflictError,
	NotFoundError,
	ValidationError,
	assertPermission,
	createEvent,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type EventBus,
	type Result
} from '#shared';
import {
	stockAdjustSchema,
	type InventoryListQuery,
	type InventoryListResult,
	type MovementListQuery,
	type InventoryReportData,
	type MovementListResult,
	type StockAdjustInput,
	type StockAdjustment,
	type StockLine,
	type StockReference
} from '../domain/inventory.ts';
import type { InventoryRepository } from './inventory-repository.ts';
import { INVENTORY_EVENTS } from '../contracts.ts';

export interface InventoryService {
	list(query: InventoryListQuery, actor: Actor): Promise<Result<InventoryListResult, AppError>>;
	listMovements(
		query: MovementListQuery,
		actor: Actor
	): Promise<Result<MovementListResult, AppError>>;
	adjust(input: StockAdjustInput, actor: Actor): Promise<Result<StockAdjustment, AppError>>;
	/** Everything the inventory report needs: all variants and the last 30 days of movement totals. */
	getReportData(actor: Actor): Promise<Result<InventoryReportData, AppError>>;
	/**
	 * Service-to-service: takes stock for an order. All lines succeed or none do;
	 * fails with 409 naming the variant when stock is insufficient. Needs no actor.
	 */
	reserve(lines: StockLine[], reference: StockReference): Promise<Result<void, AppError>>;
	/** Service-to-service: gives reserved stock back, for example when an order fails or is cancelled. */
	release(lines: StockLine[], reference: StockReference): Promise<Result<void, AppError>>;
}

export function createInventoryService(
	repository: InventoryRepository,
	clock: Clock = systemClock,
	events?: EventBus
): InventoryService {
	async function publishAdjustments(
		lines: StockLine[],
		stock: Array<{ variantId: string; stock: number; movementId: string }>,
		sign: 1 | -1
	): Promise<void> {
		for (const entry of stock) {
			const line = lines.find((candidate) => candidate.variantId === entry.variantId);
			if (!line) continue;
			await events?.publish(
				createEvent(INVENTORY_EVENTS.adjusted, {
					variantId: entry.variantId,
					delta: sign * line.quantity,
					stock: entry.stock,
					movementId: entry.movementId
				})
			);
		}
	}

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
					return err(new NotFoundError('Variant not found', { messageKey: 'variant_not_found' }));
				}

				if (outcome.kind === 'negative') {
					return err(
						new ConflictError(`Stock cannot go below zero (current: ${outcome.currentStock})`, {
							messageKey: 'stock_below_zero',
							params: { current: outcome.currentStock }
						})
					);
				}

				await events?.publish(
					createEvent(INVENTORY_EVENTS.adjusted, {
						variantId: outcome.adjustment.id,
						delta: parsed.data.delta,
						stock: outcome.adjustment.stock,
						movementId: outcome.adjustment.movementId
					})
				);
				return ok(outcome.adjustment);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async getReportData(actor) {
			try {
				assertPermission(actor, 'catalog:inventory:read');
				const since = new Date(clock.now().getTime() - 30 * 86_400_000);
				const [variants, recentMovements] = await Promise.all([
					repository.listAllVariants(),
					repository.movementTotalsSince(since, 10)
				]);
				return ok({ variants, recentMovements });
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async reserve(lines, reference) {
			try {
				if (!lines.length) return ok(undefined);
				const outcome = await repository.reserveStock(lines, reference, {
					now: clock.now(),
					newId
				});

				if (outcome.kind === 'not_found') {
					return err(
						new NotFoundError(`Variant ${outcome.variantId} not found`, {
							messageKey: 'variant_not_found'
						})
					);
				}
				if (outcome.kind === 'insufficient') {
					return err(
						new ConflictError(
							`Insufficient stock for variant ${outcome.variantId} (available: ${outcome.available})`,
							{
								details: { variantId: outcome.variantId, available: outcome.available },
								messageKey: 'insufficient_stock_variant',
								params: { available: outcome.available }
							}
						)
					);
				}

				await publishAdjustments(lines, outcome.stock, -1);
				return ok(undefined);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async release(lines, reference) {
			try {
				if (!lines.length) return ok(undefined);
				const stock = await repository.releaseStock(lines, reference, {
					now: clock.now(),
					newId
				});
				await publishAdjustments(lines, stock, 1);
				return ok(undefined);
			} catch (error) {
				return err(toAppError(error));
			}
		}
	};
}
