import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import type { ReviewListQuery } from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listReviews(query: ReviewListQuery) {
	const conditions = [];

	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(or(like(t.reviews.title, term), like(t.reviews.body, term)));
	}
	if (query.status) conditions.push(eq(t.reviews.status, query.status));
	if (query.rating) conditions.push(eq(t.reviews.rating, query.rating));
	if (query.productId) conditions.push(eq(t.reviews.productId, query.productId));

	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.reviews.id,
			productId: t.reviews.productId,
			productName: t.products.name,
			userId: t.reviews.userId,
			customerName: t.user.name,
			customerEmail: t.user.email,
			rating: t.reviews.rating,
			title: t.reviews.title,
			body: t.reviews.body,
			status: t.reviews.status,
			helpfulCount: t.reviews.helpfulCount,
			createdAt: t.reviews.createdAt
		})
		.from(t.reviews)
		.innerJoin(t.products, eq(t.reviews.productId, t.products.id))
		.leftJoin(t.user, eq(t.reviews.userId, t.user.id))
		.where(where)
		.orderBy(desc(t.reviews.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb.select({ value: count() }).from(t.reviews).where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function setReviewStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
	const [before] = await queryDb.select().from(t.reviews).where(eq(t.reviews.id, id)).limit(1);

	if (!before) return null;

	await queryDb.update(t.reviews).set({ status }).where(eq(t.reviews.id, id));

	return { ...before, id, status };
}
