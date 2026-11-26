import {
	NotFoundError,
	assertPermission,
	err,
	ok,
	toAppError,
	type Actor,
	type AppError,
	type Result
} from '#shared';
import {
	emptyRatingBuckets,
	type AdminReview,
	type PublicReview,
	type RatingBuckets,
	type Review,
	type ReviewDirectory,
	type ReviewListQuery,
	type ReviewsRepository,
	type ReviewStatus
} from '../domain/reviews.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface ReviewsService {
	listReviews(
		query: ReviewListQuery,
		actor: Actor | null
	): Outcome<{ data: AdminReview[]; page: number; pageSize: number; total: number }>;
	/** Moderation: approve or reject (or reset to pending) a review. */
	setReviewStatus(id: string, status: ReviewStatus, actor: Actor | null): Outcome<Review>;

	/** Public reads for product pages; need no actor. Only approved reviews are visible. */
	listApprovedReviews(productId: string, limit: number): Outcome<PublicReview[]>;
	getRatingBuckets(productId: string): Outcome<RatingBuckets>;
}

export function createReviewsService(
	repository: ReviewsRepository,
	directory: ReviewDirectory
): ReviewsService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	return {
		listReviews: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const { data, total } = await repository.listReviews(query);
				const [users, products] = await Promise.all([
					directory.findUsers([...new Set(data.map((review) => review.userId))]),
					directory.findProductNames([...new Set(data.map((review) => review.productId))])
				]);

				return {
					data: data.map((review) => ({
						...review,
						productName: products.get(review.productId) ?? null,
						customerName: users.get(review.userId)?.name ?? null,
						customerEmail: users.get(review.userId)?.email ?? null
					})),
					page: query.page,
					pageSize: query.pageSize,
					total
				};
			}),

		setReviewStatus: (id, status, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const before = await repository.findReview(id);
				if (!before)
					throw new NotFoundError('Review not found', { messageKey: 'review_not_found' });
				await repository.updateReviewStatus(id, status);
				return { ...before, status };
			}),

		listApprovedReviews: (productId, limit) =>
			run(async () => {
				const rows = await repository.listApproved(productId, limit);
				const users = await directory.findUsers([...new Set(rows.map((row) => row.userId))]);
				return rows.map((row) => ({
					id: row.id,
					rating: row.rating,
					title: row.title,
					body: row.body,
					helpfulCount: row.helpfulCount,
					createdAt: row.createdAt,
					customerName: users.get(row.userId)?.name ?? null,
					customerImage: users.get(row.userId)?.image ?? null
				}));
			}),

		getRatingBuckets: (productId) =>
			run(async () => {
				const buckets = emptyRatingBuckets();
				for (const [rating, value] of await repository.countApprovedByRating(productId)) {
					const key = String(rating) as keyof RatingBuckets;
					if (key in buckets) buckets[key] = value;
				}
				return buckets;
			})
	};
}
