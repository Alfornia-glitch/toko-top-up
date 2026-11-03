import { and, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import { CatalogError } from '#lib/server/modules/catalog/errors.ts';
import type { CouponWriteInput } from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listCoupons(query: {
	page: number;
	pageSize: number;
	q?: string;
	status?: string;
}) {
	const conditions = [];
	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(like(t.coupons.code, term));
	}
	if (query.status) conditions.push(eq(t.coupons.status, query.status));
	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select()
		.from(t.coupons)
		.where(where)
		.orderBy(desc(t.coupons.createdAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb.select({ value: count() }).from(t.coupons).where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

function values(input: CouponWriteInput, code: string) {
	return {
		code,
		type: input.type,
		value: input.value,
		minSubtotalCents: input.minSubtotalCents,
		maxUses: input.maxUses ?? null,
		startsAt: input.startsAt ? new Date(input.startsAt) : null,
		endsAt: input.endsAt ? new Date(input.endsAt) : null,
		status: input.status,
		appliesToJson: input.appliesToJson ?? null
	};
}

async function ensureCode(code: string, excludeId?: string) {
	const condition = excludeId
		? and(eq(t.coupons.code, code), eq(t.coupons.id, excludeId))
		: eq(t.coupons.code, code);
	const [row] = await queryDb
		.select({ id: t.coupons.id })
		.from(t.coupons)
		.where(condition)
		.limit(1);
	if (row && row.id !== excludeId)
		throw new CatalogError(409, `Coupon code "${code}" already exists`);
}

export async function createCoupon(input: CouponWriteInput) {
	const code = input.code.toUpperCase();
	const [existing] = await queryDb
		.select({ id: t.coupons.id })
		.from(t.coupons)
		.where(eq(t.coupons.code, code))
		.limit(1);
	if (existing) throw new CatalogError(409, `Coupon code "${code}" already exists`);

	const id = crypto.randomUUID();
	const now = new Date();
	await queryDb.insert(t.coupons).values({
		id,
		...values(input, code),
		usedCount: 0,
		createdAt: now,
		updatedAt: now
	});
	return id;
}

export async function updateCoupon(id: string, input: CouponWriteInput) {
	const [existing] = await queryDb.select().from(t.coupons).where(eq(t.coupons.id, id)).limit(1);
	if (!existing) return null;

	await ensureCode(input.code.toUpperCase(), id);
	await queryDb
		.update(t.coupons)
		.set({ ...values(input, input.code.toUpperCase()), updatedAt: new Date() })
		.where(eq(t.coupons.id, id));
	return { ...existing, ...values(input, input.code.toUpperCase()) };
}

export async function deleteCoupon(id: string) {
	const [existing] = await queryDb
		.select({ id: t.coupons.id })
		.from(t.coupons)
		.where(eq(t.coupons.id, id))
		.limit(1);
	if (!existing) return 'not_found';

	const [redemptions] = await queryDb
		.select({ value: count() })
		.from(t.couponRedemptions)
		.where(eq(t.couponRedemptions.couponId, id));
	if (Number(redemptions?.value ?? 0) > 0) return 'in_use';

	await queryDb.delete(t.coupons).where(eq(t.coupons.id, id));
	return 'deleted';
}

export async function couponOptions() {
	return queryDb.select({ id: t.coupons.id, code: t.coupons.code }).from(t.coupons);
}
