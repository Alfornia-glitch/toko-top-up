import {
	ConflictError,
	NotFoundError,
	ValidationError,
	err,
	newId,
	ok,
	slugify,
	systemClock,
	toAppError,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	productWriteSchema,
	type ProductDetail,
	type ProductListQuery,
	type ProductListResult,
	type ProductStatus,
	type ProductWriteInput
} from '../domain/product.ts';
import type { ProductRepository } from './product-repository.ts';

export interface ProductService {
	list(query: ProductListQuery): Promise<Result<ProductListResult, AppError>>;
	get(id: string): Promise<Result<ProductDetail, AppError>>;
	create(input: ProductWriteInput, actorId: string): Promise<Result<ProductDetail, AppError>>;
	update(id: string, input: ProductWriteInput): Promise<Result<ProductDetail, AppError>>;
	setStatus(id: string, status: ProductStatus): Promise<Result<ProductDetail, AppError>>;
}

export function createProductService(
	repository: ProductRepository,
	clock: Clock = systemClock
): ProductService {
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

	async function ensureSkuAvailable(sku: string, excludeId?: string): Promise<void> {
		if (await repository.findBySku(sku, excludeId)) {
			throw new ConflictError(`SKU "${sku}" is already in use`);
		}
	}

	return {
		async list(query) {
			try {
				const result = await repository.list(query);
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

		async get(id) {
			try {
				const product = await repository.findDetail(id);
				if (!product) return err(new NotFoundError('Product not found'));
				return ok(product);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async create(input, actorId) {
			const parsed = productWriteSchema.safeParse(input);
			if (!parsed.success) {
				return err(
					new ValidationError('Invalid product data', {
						details: parsed.error.flatten()
					})
				);
			}

			try {
				const data = parsed.data;
				await ensureSkuAvailable(data.sku);

				const id = newId();
				await repository.create(data, {
					id,
					slug: await nextSlug(data.slug ?? data.name),
					now: clock.now(),
					createdBy: actorId
				});

				const product = await repository.findDetail(id);
				if (!product) return err(new NotFoundError('Product not found'));
				return ok(product);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async update(id, input) {
			const parsed = productWriteSchema.safeParse(input);
			if (!parsed.success) {
				return err(
					new ValidationError('Invalid product data', {
						details: parsed.error.flatten()
					})
				);
			}

			try {
				const existing = await repository.findById(id);
				if (!existing) return err(new NotFoundError('Product not found'));

				const data = parsed.data;
				await ensureSkuAvailable(data.sku, id);

				const product = await repository.update(id, data, {
					slug: await nextSlug(data.slug ?? data.name, id),
					now: clock.now()
				});

				if (!product) return err(new NotFoundError('Product not found'));
				return ok(product);
			} catch (error) {
				return err(toAppError(error));
			}
		},

		async setStatus(id, status) {
			try {
				const product = await repository.setStatus(id, status, clock.now());
				if (!product) return err(new NotFoundError('Product not found'));
				return ok(product);
			} catch (error) {
				return err(toAppError(error));
			}
		}
	};
}
