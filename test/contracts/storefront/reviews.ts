import type { ProductReviewReader } from '#modules/storefront/server.ts';

/** Fixed reviews for any product, standing in for the runtime's review adapter. */
export function createFakeReviewReader(): ProductReviewReader {
	return {
		async listApproved() {
			return [
				{
					id: 'review-1',
					rating: 4,
					title: 'Great',
					body: 'Works well',
					helpfulCount: 2,
					createdAt: new Date('2026-01-01T00:00:00.000Z'),
					customerName: 'Reviewer',
					customerImage: null
				}
			];
		},
		async ratingBuckets() {
			return { '1': 0, '2': 0, '3': 0, '4': 1, '5': 0 };
		}
	};
}
