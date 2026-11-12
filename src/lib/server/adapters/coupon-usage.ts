import { count, eq } from 'drizzle-orm';
import type { CouponUsageReader } from '#modules/marketing/server.ts';
import { queryDb, tables } from '#db/query.ts';

const { couponRedemptions } = tables;

/** Counts redemptions written by legacy checkout. */
export function createCouponUsageReader(): CouponUsageReader {
	return {
		async countRedemptions(couponId) {
			const [row] = await queryDb
				.select({ value: count() })
				.from(couponRedemptions)
				.where(eq(couponRedemptions.couponId, couponId));
			return Number(row?.value ?? 0);
		}
	};
}
