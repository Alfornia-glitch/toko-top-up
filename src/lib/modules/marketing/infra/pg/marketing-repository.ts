import { and, count, desc, eq, like, or } from 'drizzle-orm';
import type { PostgresDb } from '#db/core.ts';
import type { ListQuery, MarketingRepository } from '../../domain/marketing.ts';
import { coupons, giftCardTransactions, giftCards, newsletterSubscriptions } from './schema.ts';

export function createPostgresMarketingRepository(db: PostgresDb): MarketingRepository {
	return {
		async listCoupons(query: ListQuery) {
			const conditions = [];
			if (query.q) conditions.push(like(coupons.code, `%${query.q}%`));
			if (query.status) conditions.push(eq(coupons.status, query.status as never));
			const where = conditions.length ? and(...conditions) : undefined;

			const data = await db
				.select()
				.from(coupons)
				.where(where)
				.orderBy(desc(coupons.createdAt))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [row] = await db.select({ value: count() }).from(coupons).where(where);

			return { data, total: Number(row?.value ?? 0) };
		},

		async findCoupon(id) {
			const [row] = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
			return row ?? null;
		},

		async findCouponByCode(code) {
			const [row] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
			return row ?? null;
		},

		async insertCoupon(coupon) {
			await db.insert(coupons).values(coupon);
		},

		async updateCoupon(id, patch) {
			await db.update(coupons).set(patch).where(eq(coupons.id, id));
		},

		async deleteCoupon(id) {
			await db.delete(coupons).where(eq(coupons.id, id));
		},

		async listGiftCards(query: ListQuery) {
			const conditions = [];
			if (query.q) {
				const term = `%${query.q}%`;
				conditions.push(
					or(
						like(giftCards.code, term),
						like(giftCards.recipientEmail, term),
						like(giftCards.recipientName, term)
					)
				);
			}
			if (query.status) conditions.push(eq(giftCards.status, query.status as never));
			const where = conditions.length ? and(...conditions) : undefined;

			const data = await db
				.select()
				.from(giftCards)
				.where(where)
				.orderBy(desc(giftCards.createdAt))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [row] = await db.select({ value: count() }).from(giftCards).where(where);

			return { data, total: Number(row?.value ?? 0) };
		},

		async listGiftCardsFor(userId, email) {
			const where = email
				? or(eq(giftCards.purchaserUserId, userId), eq(giftCards.recipientEmail, email))
				: eq(giftCards.purchaserUserId, userId);
			return db.select().from(giftCards).where(where).orderBy(desc(giftCards.createdAt));
		},

		async findGiftCard(id) {
			const [row] = await db.select().from(giftCards).where(eq(giftCards.id, id)).limit(1);
			return row ?? null;
		},

		async findGiftCardByCode(code) {
			const [row] = await db.select().from(giftCards).where(eq(giftCards.code, code)).limit(1);
			return row ?? null;
		},

		async listGiftCardTransactions(giftCardId) {
			return db
				.select()
				.from(giftCardTransactions)
				.where(eq(giftCardTransactions.giftCardId, giftCardId))
				.orderBy(desc(giftCardTransactions.createdAt));
		},

		async insertGiftCard(card, issued) {
			await db.transaction(async (tx) => {
				await tx.insert(giftCards).values(card);
				await tx.insert(giftCardTransactions).values(issued);
			});
		},

		async updateGiftCard(id, patch) {
			await db.update(giftCards).set(patch).where(eq(giftCards.id, id));
		},

		async listSubscriptions(query: ListQuery) {
			const conditions = [];
			if (query.q) conditions.push(like(newsletterSubscriptions.email, `%${query.q}%`));
			if (query.status) {
				conditions.push(eq(newsletterSubscriptions.status, query.status as never));
			}
			const where = conditions.length ? and(...conditions) : undefined;

			const data = await db
				.select()
				.from(newsletterSubscriptions)
				.where(where)
				.orderBy(desc(newsletterSubscriptions.createdAt))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [row] = await db.select({ value: count() }).from(newsletterSubscriptions).where(where);

			return { data, total: Number(row?.value ?? 0) };
		},

		async findSubscriptionById(id) {
			const [row] = await db
				.select()
				.from(newsletterSubscriptions)
				.where(eq(newsletterSubscriptions.id, id))
				.limit(1);
			return row ?? null;
		},

		async findSubscriptionByEmail(email) {
			const [row] = await db
				.select()
				.from(newsletterSubscriptions)
				.where(eq(newsletterSubscriptions.email, email))
				.limit(1);
			return row ?? null;
		},

		async findSubscriptionFor(userId, email) {
			const [row] = await db
				.select()
				.from(newsletterSubscriptions)
				.where(
					or(eq(newsletterSubscriptions.userId, userId), eq(newsletterSubscriptions.email, email))
				)
				.limit(1);
			return row ?? null;
		},

		async findSubscriptionByUser(userId) {
			const [row] = await db
				.select()
				.from(newsletterSubscriptions)
				.where(eq(newsletterSubscriptions.userId, userId))
				.limit(1);
			return row ?? null;
		},

		async insertSubscription(subscription) {
			await db.insert(newsletterSubscriptions).values(subscription);
		},

		async updateSubscription(id, patch) {
			await db.update(newsletterSubscriptions).set(patch).where(eq(newsletterSubscriptions.id, id));
		}
	};
}
