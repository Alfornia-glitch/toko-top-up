import {
	ConflictError,
	NotFoundError,
	ValidationError,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	assertPermission,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	brandWriteSchema,
	slugify,
	type Brand,
	type BrandOption,
	type BrandSummary,
	type BrandWriteInput
} from '../domain/brand.ts';
import type { BrandRepository } from './brand-repository.ts';

export interface BrandService {
	list(actor: Actor): Promise<Result<BrandSummary[], AppError>>;
	listOptions(actor: Actor): Promise<Result<BrandOption[], AppError>>;
	create(input: BrandWriteInput, actor: Actor): Promise<Result<Brand, AppError>>;
	update(id: string, input: BrandWriteInput, actor: Actor): Promise<Result<Brand, AppError>>;
	delete(id: string, actor: Actor): Promise<Result<{ id: string }, AppError>>;
}

export function createBrandService(
	repository: BrandRepository,
	clock: Clock = systemClock
): BrandService {
	async function nextSlug(value: string, excludeId?: string): Promise<string> {
		const base = slugify(value) || 'item';
		let candidate = base;
		let counter = 1;

		while (await repository.findBySlug(candidate, excludeId)) {
			counter += 1;
			candidate = `${base}-${counter}`;
		}

		return candidate;
	}

	return {
		async list(actor) {
			try {
				assertPermission(actor, 'catalog:read');
				const rows = await repository.listWithProductCounts();
				return ok(sortByName(rows));
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async listOptions(actor) {
			try {
				assertPermission(actor, 'catalog:read');
				const rows = await repository.listActiveOptions();
				return ok(sortByName(rows));
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async create(input, actor) {
			try {
				assertPermission(actor, 'catalog:write');
				const parsed = brandWriteSchema.safeParse(input);
				if (!parsed.success) {
					return err(
						new ValidationError('Invalid brand data', {
							details: parsed.error.flatten()
						})
					);
				}

				const now = clock.now();
				const brand: Brand = {
					id: newId(),
					name: parsed.data.name,
					slug: await nextSlug(parsed.data.slug ?? parsed.data.name),
					logoUrl: parsed.data.logoUrl ?? null,
					description: parsed.data.description ?? null,
					status: parsed.data.status,
					createdAt: now,
					updatedAt: now
				};

				await repository.create(brand);
				return ok(brand);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async update(id, input, actor) {
			try {
				assertPermission(actor, 'catalog:write');
				const parsed = brandWriteSchema.safeParse(input);
				if (!parsed.success) {
					return err(
						new ValidationError('Invalid brand data', {
							details: parsed.error.flatten()
						})
					);
				}

				const updated = await repository.update(id, {
					name: parsed.data.name,
					slug: await nextSlug(parsed.data.slug ?? parsed.data.name, id),
					logoUrl: parsed.data.logoUrl ?? null,
					description: parsed.data.description ?? null,
					status: parsed.data.status,
					updatedAt: clock.now()
				});

				if (!updated)
					return err(new NotFoundError('Brand not found', { messageKey: 'brand_not_found' }));
				return ok(updated);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async delete(id, actor) {
			try {
				assertPermission(actor, 'catalog:write');
				const existing = await repository.findById(id);
				if (!existing)
					return err(new NotFoundError('Brand not found', { messageKey: 'brand_not_found' }));

				const products = await repository.countProducts(id);
				if (products > 0) {
					return err(
						new ConflictError('Reassign or delete products that use this brand first', {
							messageKey: 'brand_in_use'
						})
					);
				}

				await repository.delete(id);
				return ok({ id });
			} catch (error) {
				return err(toAppError(error));
			}
		}
	};
}

function sortByName<T extends { name: string }>(rows: T[]): T[] {
	return [...rows].sort((left, right) => left.name.localeCompare(right.name));
}
