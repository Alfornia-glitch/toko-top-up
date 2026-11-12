import { and, count, desc, eq } from 'drizzle-orm';
import type { ProductReviewReader } from '#modules/storefront/server.ts';
import { queryDb, tables } from '#db/query.ts';

const { reviews, user } = tables;

/** Reads approved reviews through the legacy shared schema. */
export function createProductReviewReader(): ProductReviewReader {
	return {
		async listApproved(productId, limit) {
			return queryDb
				.select({
					id: reviews.id,
					rating: reviews.rating,
					title: reviews.title,
					body: reviews.body,
					helpfulCount: reviews.helpfulCount,
					createdAt: reviews.createdAt,
					customerName: user.name,
					customerImage: user.image
				})
				.from(reviews)
				.leftJoin(user, eq(reviews.userId, user.id))
				.where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
				.orderBy(desc(reviews.createdAt))
				.limit(limit);
		},

		async ratingBuckets(productId) {
			const rows = await queryDb
				.select({ rating: reviews.rating, value: count() })
				.from(reviews)
				.where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
				.groupBy(reviews.rating);

			const buckets = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
			for (const row of rows) {
				const key = String(row.rating) as keyof typeof buckets;
				if (key in buckets) buckets[key] = Number(row.value ?? 0);
			}
			return buckets;
		}
	};
}
