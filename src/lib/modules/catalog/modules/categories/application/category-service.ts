import {
	ConflictError,
	NotFoundError,
	UnprocessableError,
	ValidationError,
	err,
	newId,
	ok,
	slugify,
	systemClock,
	toAppError,
	assertPermission,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	categoryWriteSchema,
	type Category,
	type CategorySummary,
	type CategoryWriteInput
} from '../domain/category.ts';
import type { CategoryRepository } from './category-repository.ts';

export interface CategoryService {
	list(actor: Actor): Promise<Result<CategorySummary[], AppError>>;
	create(input: CategoryWriteInput, actor: Actor): Promise<Result<Category, AppError>>;
	update(id: string, input: CategoryWriteInput, actor: Actor): Promise<Result<Category, AppError>>;
	delete(id: string, actor: Actor): Promise<Result<{ id: string }, AppError>>;
}

export function createCategoryService(
	repository: CategoryRepository,
	clock: Clock = systemClock
): CategoryService {
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

	async function assertNoCycle(id: string, parentId: string | null): Promise<void> {
		let current = parentId;

		while (current) {
			if (current === id) {
				throw new UnprocessableError('Category hierarchy cannot contain a cycle');
			}

			const category = await repository.findById(current);
			current = category?.parentId ?? null;
		}
	}

	return {
		async list(actor) {
			try {
				assertPermission(actor, 'catalog:read');
				return ok(await repository.listWithProductCounts());
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async create(input, actor) {
			try {
				assertPermission(actor, 'catalog:write');
				const parsed = categoryWriteSchema.safeParse(input);
				if (!parsed.success) {
					return err(
						new ValidationError('Invalid category data', {
							details: parsed.error.flatten()
						})
					);
				}

				const now = clock.now();
				const category: Category = {
					id: newId(),
					name: parsed.data.name,
					slug: await nextSlug(parsed.data.slug ?? parsed.data.name),
					parentId: parsed.data.parentId ?? null,
					description: parsed.data.description ?? null,
					imageUrl: parsed.data.imageUrl ?? null,
					position: parsed.data.position,
					status: parsed.data.status,
					createdAt: now,
					updatedAt: now
				};

				await repository.create(category);
				return ok(category);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async update(id, input, actor) {
			try {
				assertPermission(actor, 'catalog:write');
				const parsed = categoryWriteSchema.safeParse(input);
				if (!parsed.success) {
					return err(
						new ValidationError('Invalid category data', {
							details: parsed.error.flatten()
						})
					);
				}

				const existing = await repository.findById(id);
				if (!existing) return err(new NotFoundError('Category not found'));

				const parentId = parsed.data.parentId ?? null;
				if (parentId === id) {
					return err(new UnprocessableError('A category cannot be its own parent'));
				}

				await assertNoCycle(id, parentId);

				const updated = await repository.update(id, {
					name: parsed.data.name,
					slug: await nextSlug(parsed.data.slug ?? parsed.data.name, id),
					parentId,
					description: parsed.data.description ?? null,
					imageUrl: parsed.data.imageUrl ?? null,
					position: parsed.data.position,
					status: parsed.data.status,
					updatedAt: clock.now()
				});

				if (!updated) return err(new NotFoundError('Category not found'));
				return ok(updated);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async delete(id, actor) {
			try {
				assertPermission(actor, 'catalog:write');
				const existing = await repository.findById(id);
				if (!existing) return err(new NotFoundError('Category not found'));

				const [children, products] = await Promise.all([
					repository.countChildren(id),
					repository.countProducts(id)
				]);

				if (children > 0 || products > 0) {
					return err(new ConflictError('Move or delete child categories and products first'));
				}

				await repository.delete(id);
				return ok({ id });
			} catch (error) {
				return err(toAppError(error));
			}
		}
	};
}
