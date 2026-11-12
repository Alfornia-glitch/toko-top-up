export type CouponType = 'percentage' | 'fixed';
export type CouponStatus = 'active' | 'disabled';
export type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'disabled';
export type GiftCardTransactionType = 'issue' | 'redeem' | 'refund';
export type NewsletterStatus = 'subscribed' | 'unsubscribed';

export interface Coupon {
	id: string;
	code: string;
	type: CouponType;
	value: number;
	minSubtotalCents: number;
	maxUses: number | null;
	usedCount: number;
	startsAt: Date | null;
	endsAt: Date | null;
	status: CouponStatus;
	appliesToJson: Record<string, unknown> | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CouponInput {
	code: string;
	type: CouponType;
	value: number;
	minSubtotalCents: number;
	maxUses?: number | null | undefined;
	startsAt?: string | null | undefined;
	endsAt?: string | null | undefined;
	status: CouponStatus;
	appliesToJson?: Record<string, unknown> | null | undefined;
}

export interface GiftCard {
	id: string;
	code: string;
	initialAmountCents: number;
	balanceCents: number;
	currency: string;
	status: GiftCardStatus;
	recipientName: string | null;
	recipientEmail: string | null;
	purchaserUserId: string | null;
	orderId: string | null;
	message: string | null;
	deliveredAt: Date | null;
	expiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface GiftCardTransaction {
	id: string;
	giftCardId: string;
	orderId: string | null;
	amountCents: number;
	type: GiftCardTransactionType;
	createdAt: Date;
}

export type GiftCardDetail = GiftCard & { transactions: GiftCardTransaction[] };

/** What a customer sees of their own gift cards. */
export type CustomerGiftCard = Pick<
	GiftCard,
	| 'id'
	| 'code'
	| 'initialAmountCents'
	| 'balanceCents'
	| 'currency'
	| 'status'
	| 'expiresAt'
	| 'createdAt'
>;

export interface GiftCardInput {
	code?: string | undefined;
	initialAmountCents: number;
	currency: string;
	recipientName?: string | null | undefined;
	recipientEmail?: string | null | undefined;
	message?: string | null | undefined;
	expiresAt?: string | null | undefined;
}

export interface GiftCardUpdateInput {
	status?: GiftCardStatus | undefined;
	balanceCents?: number | undefined;
	recipientName?: string | null | undefined;
	recipientEmail?: string | null | undefined;
	message?: string | null | undefined;
	expiresAt?: string | null | undefined;
}

export interface NewsletterSubscription {
	id: string;
	userId: string | null;
	email: string;
	preferencesJson: Record<string, unknown> | null;
	status: NewsletterStatus;
	source: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface ListQuery {
	q?: string | undefined;
	status?: string | undefined;
	page: number;
	pageSize: number;
}

export interface PageResult<T> {
	data: T[];
	page: number;
	pageSize: number;
	total: number;
}

export interface CouponRedemption {
	id: string;
	couponId: string;
	orderId: string;
	userId: string | null;
	amountCents: number;
	createdAt: Date;
}

export interface RedeemCouponInput {
	couponId: string;
	orderId: string;
	userId: string | null;
	amountCents: number;
}

export type RedeemOutcome = 'redeemed' | 'duplicate' | 'exhausted';

export interface MarketingRepository {
	listCoupons(query: ListQuery): Promise<{ data: Coupon[]; total: number }>;
	findCoupon(id: string): Promise<Coupon | null>;
	findCouponByCode(code: string): Promise<Coupon | null>;
	insertCoupon(coupon: Coupon): Promise<void>;
	updateCoupon(id: string, patch: Partial<Coupon>): Promise<void>;
	deleteCoupon(id: string): Promise<void>;
	countRedemptions(couponId: string): Promise<number>;
	/**
	 * Atomically records the redemption and increments `usedCount`.
	 * `duplicate` when this order already redeemed the coupon; `exhausted` when
	 * `maxUses` is already reached (nothing is written in either case).
	 */
	redeemCoupon(redemption: CouponRedemption, now: Date): Promise<RedeemOutcome>;

	listGiftCards(query: ListQuery): Promise<{ data: GiftCard[]; total: number }>;
	listGiftCardsFor(userId: string, email: string | null): Promise<GiftCard[]>;
	findGiftCard(id: string): Promise<GiftCard | null>;
	findGiftCardByCode(code: string): Promise<GiftCard | null>;
	listGiftCardTransactions(giftCardId: string): Promise<GiftCardTransaction[]>;
	/** Inserts the card and its issue transaction atomically. */
	insertGiftCard(card: GiftCard, issued: GiftCardTransaction): Promise<void>;
	updateGiftCard(id: string, patch: Partial<GiftCard>): Promise<void>;

	listSubscriptions(query: ListQuery): Promise<{ data: NewsletterSubscription[]; total: number }>;
	findSubscriptionById(id: string): Promise<NewsletterSubscription | null>;
	findSubscriptionByEmail(email: string): Promise<NewsletterSubscription | null>;
	findSubscriptionFor(userId: string, email: string): Promise<NewsletterSubscription | null>;
	findSubscriptionByUser(userId: string): Promise<NewsletterSubscription | null>;
	insertSubscription(subscription: NewsletterSubscription): Promise<void>;
	updateSubscription(id: string, patch: Partial<NewsletterSubscription>): Promise<void>;
}

export function parseDate(value: string | null | undefined): Date | null {
	return value ? new Date(value) : null;
}

export function toCustomerGiftCard(card: GiftCard): CustomerGiftCard {
	return {
		id: card.id,
		code: card.code,
		initialAmountCents: card.initialAmountCents,
		balanceCents: card.balanceCents,
		currency: card.currency,
		status: card.status,
		expiresAt: card.expiresAt,
		createdAt: card.createdAt
	};
}

export function generateGiftCardCode(id: string): string {
	return id.replaceAll('-', '').slice(0, 16).toUpperCase();
}

export function discountFor(coupon: Pick<Coupon, 'type' | 'value'>, subtotalCents: number): number {
	if (coupon.type === 'percentage') return Math.round((subtotalCents * coupon.value) / 100);
	return Math.min(coupon.value, subtotalCents);
}

/** Whether the coupon can be applied to a cart of this subtotal right now. */
export function isCouponApplicable(coupon: Coupon, subtotalCents: number, now: number): boolean {
	if (coupon.status !== 'active') return false;
	if (coupon.startsAt && now < coupon.startsAt.getTime()) return false;
	if (coupon.endsAt && now > coupon.endsAt.getTime()) return false;
	if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return false;
	return subtotalCents >= coupon.minSubtotalCents;
}
