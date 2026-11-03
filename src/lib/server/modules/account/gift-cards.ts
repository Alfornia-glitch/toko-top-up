import { desc, eq, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listGiftCards(userId: string) {
	const [account] = await queryDb
		.select({ email: t.user.email })
		.from(t.user)
		.where(eq(t.user.id, userId))
		.limit(1);

	const email: string | undefined = account?.email;
	const where = email
		? or(eq(t.giftCards.purchaserUserId, userId), eq(t.giftCards.recipientEmail, email))
		: eq(t.giftCards.purchaserUserId, userId);

	return queryDb
		.select({
			id: t.giftCards.id,
			code: t.giftCards.code,
			initialAmountCents: t.giftCards.initialAmountCents,
			balanceCents: t.giftCards.balanceCents,
			currency: t.giftCards.currency,
			status: t.giftCards.status,
			expiresAt: t.giftCards.expiresAt,
			createdAt: t.giftCards.createdAt
		})
		.from(t.giftCards)
		.where(where)
		.orderBy(desc(t.giftCards.createdAt));
}
