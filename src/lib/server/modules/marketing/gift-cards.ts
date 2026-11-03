import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from '#lib/server/modules/catalog/errors.ts';
import type {
	GiftCardUpdateInput,
	GiftCardWriteInput
} from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listGiftCards(query: {
	page: number;
	pageSize: number;
	q?: string;
	status?: string;
}) {
	const conditions = [];
	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(
			or(
				like(t.giftCards.code, term),
				like(t.giftCards.recipientEmail, term),
				like(t.giftCards.recipientName, term)
			)
		);
	}
	if (query.status) conditions.push(eq(t.giftCards.status, query.status));
	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select()
		.from(t.giftCards)
		.where(where)
		.orderBy(desc(t.giftCards.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.giftCards)
		.where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

function generateCode() {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase();
}

export async function createGiftCard(input: GiftCardWriteInput) {
	let code = (input.code ?? generateCode()).toUpperCase();

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const [existing] = await queryDb
			.select({ id: t.giftCards.id })
			.from(t.giftCards)
			.where(eq(t.giftCards.code, code))
			.limit(1);
		if (!existing) break;
		if (input.code) throw new CatalogError(409, `Gift card code "${code}" already exists`);
		code = generateCode();
	}

	const id = crypto.randomUUID();
	const now = new Date();
	await queryDb.insert(t.giftCards).values({
		id,
		code,
		initialAmountCents: input.initialAmountCents,
		balanceCents: input.initialAmountCents,
		currency: input.currency,
		status: 'active',
		recipientName: input.recipientName ?? null,
		recipientEmail: input.recipientEmail ?? null,
		message: input.message ?? null,
		expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
		createdAt: now,
		updatedAt: now
	});

	await queryDb.insert(t.giftCardTransactions).values({
		id: crypto.randomUUID(),
		giftCardId: id,
		amountCents: input.initialAmountCents,
		type: 'issue',
		createdAt: now
	});

	return id;
}

export async function getGiftCard(id: string) {
	const [card] = await queryDb.select().from(t.giftCards).where(eq(t.giftCards.id, id)).limit(1);
	if (!card) return null;

	const transactions = await queryDb
		.select()
		.from(t.giftCardTransactions)
		.where(eq(t.giftCardTransactions.giftCardId, id))
		.orderBy(desc(t.giftCardTransactions.createdAt));

	return { ...card, transactions };
}

export async function updateGiftCard(id: string, input: GiftCardUpdateInput) {
	const existing = await getGiftCard(id);
	if (!existing) return null;

	await queryDb
		.update(t.giftCards)
		.set({
			...(input.status ? { status: input.status } : {}),
			...(input.balanceCents !== undefined ? { balanceCents: input.balanceCents } : {}),
			...(input.recipientName !== undefined ? { recipientName: input.recipientName } : {}),
			...(input.recipientEmail !== undefined ? { recipientEmail: input.recipientEmail } : {}),
			...(input.message !== undefined ? { message: input.message } : {}),
			...(input.expiresAt !== undefined
				? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
				: {}),
			updatedAt: new Date()
		})
		.where(eq(t.giftCards.id, id));

	return getGiftCard(id);
}
