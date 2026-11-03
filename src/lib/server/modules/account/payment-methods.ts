import { and, desc, eq, ne } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import type { PaymentMethodWriteInput } from '#lib/server/modules/customer/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

type PaymentMethodRow = {
	id: string;
	brand: string | null;
	last4: string | null;
	expMonth: number | null;
	expYear: number | null;
	isDefault: boolean;
	status: string;
};

function toPaymentMethod(row: PaymentMethodRow) {
	return {
		id: row.id,
		brand: row.brand,
		last4: row.last4,
		expMonth: row.expMonth,
		expYear: row.expYear,
		isDefault: row.isDefault,
		status: row.status
	};
}

async function getPaymentMethod(userId: string, id: string) {
	const [row] = (await queryDb
		.select()
		.from(t.paymentMethods)
		.where(
			and(
				eq(t.paymentMethods.id, id),
				eq(t.paymentMethods.userId, userId),
				ne(t.paymentMethods.status, 'removed')
			)
		)
		.limit(1)) as PaymentMethodRow[];

	return row ? toPaymentMethod(row) : null;
}

export async function listPaymentMethods(userId: string) {
	const rows = (await queryDb
		.select()
		.from(t.paymentMethods)
		.where(and(eq(t.paymentMethods.userId, userId), ne(t.paymentMethods.status, 'removed')))
		.orderBy(
			desc(t.paymentMethods.isDefault),
			desc(t.paymentMethods.createdAt)
		)) as PaymentMethodRow[];

	return rows.map(toPaymentMethod);
}

export async function createPaymentMethod(userId: string, input: PaymentMethodWriteInput) {
	const id = crypto.randomUUID();
	const now = new Date();
	const isDefault = input.isDefault ?? false;

	await queryDb.transaction(async (tx: any) => {
		if (isDefault) {
			await tx
				.update(t.paymentMethods)
				.set({ isDefault: false, updatedAt: now })
				.where(eq(t.paymentMethods.userId, userId));
		}

		await tx.insert(t.paymentMethods).values({
			id,
			userId,
			provider: 'mock',
			brand: input.brand,
			last4: input.last4,
			expMonth: input.expMonth,
			expYear: input.expYear,
			isDefault,
			status: 'active',
			createdAt: now,
			updatedAt: now
		});
	});

	return getPaymentMethod(userId, id);
}

export async function updatePaymentMethod(
	userId: string,
	id: string,
	input: PaymentMethodWriteInput
) {
	const [existing] = (await queryDb
		.select()
		.from(t.paymentMethods)
		.where(
			and(
				eq(t.paymentMethods.id, id),
				eq(t.paymentMethods.userId, userId),
				ne(t.paymentMethods.status, 'removed')
			)
		)
		.limit(1)) as PaymentMethodRow[];

	if (!existing) return null;

	const now = new Date();
	const isDefault = input.isDefault ?? existing.isDefault;

	await queryDb.transaction(async (tx: any) => {
		if (isDefault) {
			await tx
				.update(t.paymentMethods)
				.set({ isDefault: false, updatedAt: now })
				.where(and(eq(t.paymentMethods.userId, userId), ne(t.paymentMethods.id, id)));
		}

		await tx
			.update(t.paymentMethods)
			.set({
				brand: input.brand,
				last4: input.last4,
				expMonth: input.expMonth,
				expYear: input.expYear,
				isDefault,
				updatedAt: now
			})
			.where(and(eq(t.paymentMethods.id, id), eq(t.paymentMethods.userId, userId)));
	});

	return getPaymentMethod(userId, id);
}

export async function deletePaymentMethod(userId: string, id: string) {
	const [existing] = await queryDb
		.select({ id: t.paymentMethods.id })
		.from(t.paymentMethods)
		.where(
			and(
				eq(t.paymentMethods.id, id),
				eq(t.paymentMethods.userId, userId),
				ne(t.paymentMethods.status, 'removed')
			)
		)
		.limit(1);

	if (!existing) return false;

	await queryDb
		.update(t.paymentMethods)
		.set({ status: 'removed', isDefault: false, updatedAt: new Date() })
		.where(and(eq(t.paymentMethods.id, id), eq(t.paymentMethods.userId, userId)));

	return true;
}
