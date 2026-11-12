import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import type { ReviewsRepository } from '../../domain/reviews.ts';
import { reviews } from './schema.ts';

export function createSqliteReviewsRepository(db: SqliteDb): ReviewsRepository {
	return {
		async listReviews(query) {
			const conditions: SQL[] = [];
			if (query.q) {
				const term = `%${query.q}%`;
				const search = or(like(reviews.title, term), like(reviews.body, term));
				if (search) conditions.push(search);
			}
			if (query.status) conditions.push(eq(reviews.status, query.status as never));
			if (query.rating) conditions.push(eq(reviews.rating, query.rating));
			if (query.productId) conditions.push(eq(reviews.productId, query.productId));
			const where = conditions.length ? and(...conditions) : undefined;

			const data = await db
				.select()
				.from(reviews)
				.where(where)
				.orderBy(desc(reviews.createdAt))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [row] = await db.select({ value: count() }).from(reviews).where(where);

			return { data, total: Number(row?.value ?? 0) };
		},

		async findReview(id) {
			const [row] = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
			return row ?? null;
		},

		async updateReviewStatus(id, status) {
			await db.update(reviews).set({ status }).where(eq(reviews.id, id));
		},

		async listApproved(productId, limit) {
			return db
				.select()
				.from(reviews)
				.where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
				.orderBy(desc(reviews.createdAt))
				.limit(limit);
		},

		async countApprovedByRating(productId) {
			const rows = await db
				.select({ rating: reviews.rating, value: count() })
				.from(reviews)
				.where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
				.groupBy(reviews.rating);
			return new Map(rows.map((row) => [row.rating, Number(row.value)]));
		}
	};
}
