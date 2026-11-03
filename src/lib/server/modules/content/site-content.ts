import { asc, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export type ContentKind = 'banners' | 'announcements' | 'testimonials';

const TABLE: Record<ContentKind, any> = {
	banners: t.banners,
	announcements: t.announcements,
	testimonials: t.testimonials
};

function normalise(kind: ContentKind, input: Record<string, unknown>) {
	const values: Record<string, unknown> = { ...input };

	if (kind !== 'testimonials') {
		for (const key of ['startsAt', 'endsAt']) {
			const value = input[key];
			values[key] = typeof value === 'string' && value ? new Date(value) : null;
		}
	}

	for (const key of ['subtitle', 'mobileImageUrl', 'ctaLabel', 'ctaUrl', 'link', 'caption']) {
		if (values[key] === undefined) values[key] = null;
	}

	return values;
}

export function tableFor(kind: ContentKind) {
	return TABLE[kind];
}

export async function listContent(kind: ContentKind) {
	return queryDb
		.select()
		.from(TABLE[kind])
		.orderBy(asc(TABLE[kind].position), asc(TABLE[kind].createdAt));
}

export async function createContent(kind: ContentKind, input: Record<string, unknown>) {
	const table = TABLE[kind];
	const id = crypto.randomUUID();
	const now = new Date();

	await queryDb.insert(table).values({
		id,
		...normalise(kind, input),
		createdAt: now,
		updatedAt: now
	});

	return id;
}

export async function updateContent(kind: ContentKind, id: string, input: Record<string, unknown>) {
	const table = TABLE[kind];
	const [existing] = await queryDb.select().from(table).where(eq(table.id, id)).limit(1);
	if (!existing) return null;

	await queryDb
		.update(table)
		.set({ ...normalise(kind, input), updatedAt: new Date() })
		.where(eq(table.id, id));

	return { ...existing, ...normalise(kind, input) };
}

export async function deleteContent(kind: ContentKind, id: string) {
	const table = TABLE[kind];
	const [existing] = await queryDb
		.select({ id: table.id })
		.from(table)
		.where(eq(table.id, id))
		.limit(1);
	if (!existing) return false;

	await queryDb.delete(table).where(eq(table.id, id));
	return true;
}
