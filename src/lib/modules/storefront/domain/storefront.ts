export interface ProductReview {
	id: string;
	rating: number;
	title: string | null;
	body: string | null;
	helpfulCount: number;
	createdAt: Date;
	customerName: string | null;
	customerImage: string | null;
}

export type RatingBuckets = Record<'1' | '2' | '3' | '4' | '5', number>;

/**
 * Read-only port over approved product reviews. Reviews are not owned by a
 * migrated module yet, so the runtime supplies the adapter.
 */
export interface ProductReviewReader {
	listApproved(productId: string, limit: number): Promise<ProductReview[]>;
	ratingBuckets(productId: string): Promise<RatingBuckets>;
}

export const RELATED_PRODUCT_LIMIT = 8;
export const RELATED_CANDIDATE_LIMIT = 12;
export const REVIEW_LIMIT = 50;
