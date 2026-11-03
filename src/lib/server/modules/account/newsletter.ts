import { eq, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function getSubscription(userId: string, email: string) {
	const [row] = await queryDb
		.select()
		.from(t.newsletterSubscriptions)
		.where(
			or(eq(t.newsletterSubscriptions.userId, userId), eq(t.newsletterSubscriptions.email, email))
		)
		.limit(1);

	return row ?? null;
}

export async function subscribe(userId: string, email: string) {
	const now = new Date();
	const [existing] = await queryDb
		.select()
		.from(t.newsletterSubscriptions)
		.where(eq(t.newsletterSubscriptions.email, email))
		.limit(1);

	if (existing) {
		await queryDb
			.update(t.newsletterSubscriptions)
			.set({
				userId: existing.userId ?? userId,
				status: 'subscribed',
				source: 'account',
				updatedAt: now
			})
			.where(eq(t.newsletterSubscriptions.id, existing.id));
	} else {
		await queryDb.insert(t.newsletterSubscriptions).values({
			id: crypto.randomUUID(),
			userId,
			email,
			status: 'subscribed',
			source: 'account',
			createdAt: now,
			updatedAt: now
		});
	}

	return getSubscription(userId, email);
}

export async function setStatus(userId: string, status: 'subscribed' | 'unsubscribed') {
	const [existing] = await queryDb
		.select()
		.from(t.newsletterSubscriptions)
		.where(eq(t.newsletterSubscriptions.userId, userId))
		.limit(1);

	if (!existing) return null;

	const now = new Date();

	await queryDb
		.update(t.newsletterSubscriptions)
		.set({ status, updatedAt: now })
		.where(eq(t.newsletterSubscriptions.id, existing.id));

	return { ...existing, status, updatedAt: now };
}
