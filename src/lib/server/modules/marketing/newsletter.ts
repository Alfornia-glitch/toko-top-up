import { and, count, desc, eq, like } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listNewsletter(query: {
	page: number;
	pageSize: number;
	q?: string;
	status?: string;
}) {
	const conditions = [];
	if (query.q) conditions.push(like(t.newsletterSubscriptions.email, `%${query.q}%`));
	if (query.status) conditions.push(eq(t.newsletterSubscriptions.status, query.status));
	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select()
		.from(t.newsletterSubscriptions)
		.where(where)
		.orderBy(desc(t.newsletterSubscriptions.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.newsletterSubscriptions)
		.where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function setNewsletterStatus(id: string, status: 'subscribed' | 'unsubscribed') {
	const [existing] = await queryDb
		.select()
		.from(t.newsletterSubscriptions)
		.where(eq(t.newsletterSubscriptions.id, id))
		.limit(1);
	if (!existing) return null;

	await queryDb
		.update(t.newsletterSubscriptions)
		.set({ status, updatedAt: new Date() })
		.where(eq(t.newsletterSubscriptions.id, id));

	return { ...existing, status };
}
