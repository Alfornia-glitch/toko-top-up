export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
	id: string;
	productId: string;
	userId: string;
	orderItemId: string | null;
	rating: number;
	title: string | null;
	body: string | null;
	status: ReviewStatus;
	helpfulCount: number;
	createdAt: Date;
}

export interface ReviewListQuery {
	q?: string | undefined;
	status?: string | undefined;
	rating?: number | undefined;
	productId?: string | undefined;
	page: number;
	pageSize: number;
}

export interface AdminReview extends Review {
	productName: string | null;
	customerName: string | null;
	customerEmail: string | null;
}

/** An approved review as shown on a product page. */
export interface PublicReview {
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

export interface ReviewUser {
	name: string;
	email: string;
	image: string | null;
}

/**
 * Read-only port over data the content module does not own: customer
 * accounts and product names. The runtime supplies the adapter.
 */
export interface ReviewDirectory {
	findUsers(ids: string[]): Promise<Map<string, ReviewUser>>;
	findProductNames(ids: string[]): Promise<Map<string, string>>;
}

export interface ReviewsRepository {
	listReviews(query: ReviewListQuery): Promise<{ data: Review[]; total: number }>;
	findReview(id: string): Promise<Review | null>;
	updateReviewStatus(id: string, status: ReviewStatus): Promise<void>;
	listApproved(productId: string, limit: number): Promise<Review[]>;
	countApprovedByRating(productId: string): Promise<Map<number, number>>;
}

export function emptyRatingBuckets(): RatingBuckets {
	return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
}
