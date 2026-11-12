import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap, type Actor } from '#shared';
import type { MarketingService } from '#modules/marketing/server.ts';
import type { CouponInput } from '#modules/marketing/index.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface MarketingContractContext {
	service: MarketingService;
	clock: TestClock;
	reset(): Promise<void>;
}

const coupon: CouponInput = {
	code: 'welcome10',
	type: 'percentage',
	value: 10,
	minSubtotalCents: 0,
	status: 'active'
};

export function runMarketingContract({ service, clock, reset }: MarketingContractContext): void {
	const admin = createAdminActor('marketing-admin');
	const ada: Actor = createForbiddenActor('customer-ada');
	const bob: Actor = createForbiddenActor('customer-bob');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	describe('coupons contract', () => {
		test('creates with an uppercased code, lists, updates and deletes', async () => {
			const id = unwrap(await service.createCoupon(coupon, admin));

			const listed = unwrap(await service.listCoupons({ page: 1, pageSize: 10 }, admin));
			expect(listed.total).toBe(1);
			expect(listed.data[0]).toMatchObject({ id, code: 'WELCOME10', usedCount: 0, maxUses: null });

			const updated = unwrap(
				await service.updateCoupon(
					id,
					{ ...coupon, value: 15, endsAt: '2026-06-01T00:00:00.000Z' },
					admin
				)
			);
			expect(updated).toMatchObject({ value: 15, endsAt: new Date('2026-06-01T00:00:00.000Z') });

			expect(unwrap(await service.deleteCoupon(id, admin))).toBe(id);
			expect(unwrap(await service.listCoupons({ page: 1, pageSize: 10 }, admin)).total).toBe(0);
		});

		test('rejects duplicate codes on create and on update of another coupon', async () => {
			unwrap(await service.createCoupon(coupon, admin));
			const other = unwrap(await service.createCoupon({ ...coupon, code: 'OTHER' }, admin));

			const dup = await service.createCoupon({ ...coupon, code: 'WELCOME10' }, admin);
			expect(dup.ok).toBe(false);
			if (!dup.ok) expect(dup.error.status).toBe(409);

			const clash = await service.updateCoupon(other, { ...coupon, code: 'welcome10' }, admin);
			expect(clash.ok).toBe(false);
			if (!clash.ok) expect(clash.error.status).toBe(409);

			expect((await service.updateCoupon(other, { ...coupon, code: 'OTHER' }, admin)).ok).toBe(
				true
			);
		});

		test('refuses to delete a redeemed coupon and reports missing ones', async () => {
			const id = unwrap(await service.createCoupon(coupon, admin));
			unwrap(
				await service.redeemCoupon({
					couponId: id,
					orderId: 'order-1',
					userId: 'u1',
					amountCents: 100
				})
			);

			const inUse = await service.deleteCoupon(id, admin);
			expect(inUse.ok).toBe(false);
			if (!inUse.ok) expect(inUse.error.status).toBe(409);

			const missing = await service.deleteCoupon('nope', admin);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);
		});

		test('requires admin access', async () => {
			const denied = await service.listCoupons({ page: 1, pageSize: 10 }, ada);
			expect(denied.ok).toBe(false);
			if (!denied.ok) expect(denied.error.status).toBe(403);
		});
	});

	describe('coupon redemption contract', () => {
		const redeem = (couponId: string, orderId: string) =>
			service.redeemCoupon({ couponId, orderId, userId: 'u1', amountCents: 500 });

		test('redeeming increments the usage count and is idempotent per order', async () => {
			const id = unwrap(await service.createCoupon(coupon, admin));
			unwrap(await redeem(id, 'order-1'));
			unwrap(await redeem(id, 'order-1'));
			unwrap(await redeem(id, 'order-2'));

			const stored = unwrap(await service.getCouponById(id));
			expect(stored?.usedCount).toBe(2);
		});

		test('stops at maxUses with a conflict and writes nothing', async () => {
			const id = unwrap(await service.createCoupon({ ...coupon, maxUses: 1 }, admin));
			unwrap(await redeem(id, 'order-1'));

			const exhausted = await redeem(id, 'order-2');
			expect(exhausted.ok).toBe(false);
			if (!exhausted.ok) expect(exhausted.error.status).toBe(409);
			expect(unwrap(await service.getCouponById(id))?.usedCount).toBe(1);
		});

		test('validates a code for a cart, with the reason when it cannot apply', async () => {
			unwrap(await service.createCoupon({ ...coupon, minSubtotalCents: 1000 }, admin));
			unwrap(await service.createCoupon({ ...coupon, code: 'OFF', status: 'disabled' }, admin));
			unwrap(
				await service.createCoupon(
					{ ...coupon, code: 'OLD', endsAt: '2025-12-31T00:00:00.000Z' },
					admin
				)
			);

			expect(unwrap(await service.validateCouponForCart(' welcome10 ', 1500)).code).toBe(
				'WELCOME10'
			);

			const cases: Array<[string, number, number, string]> = [
				['NOPE', 1500, 404, 'Coupon not found'],
				['OFF', 1500, 422, 'Coupon is not active'],
				['OLD', 1500, 422, 'Coupon has expired'],
				['WELCOME10', 500, 422, 'Cart subtotal is below the coupon minimum']
			];
			for (const [code, subtotal, status, message] of cases) {
				const result = await service.validateCouponForCart(code, subtotal);
				expect(result.ok).toBe(false);
				if (!result.ok) expect(result.error).toMatchObject({ status, message });
			}
		});
	});

	describe('gift cards contract', () => {
		const card = { initialAmountCents: 5000, currency: 'USD' };

		test('issues a card with an issue transaction and updates it', async () => {
			const id = unwrap(await service.createGiftCard({ ...card, code: 'gift-0001' }, admin));

			const detail = unwrap(await service.getGiftCard(id, admin));
			expect(detail).toMatchObject({ code: 'GIFT-0001', balanceCents: 5000, status: 'active' });
			expect(detail.transactions).toHaveLength(1);
			expect(detail.transactions[0]).toMatchObject({ type: 'issue', amountCents: 5000 });

			const updated = unwrap(
				await service.updateGiftCard(
					id,
					{ status: 'disabled', balanceCents: 0, message: 'hi' },
					admin
				)
			);
			expect(updated).toMatchObject({ status: 'disabled', balanceCents: 0, message: 'hi' });
			expect(
				unwrap(await service.listGiftCards({ page: 1, pageSize: 10, status: 'disabled' }, admin))
					.total
			).toBe(1);
		});

		test('generates a code when none is given and rejects a duplicate explicit code', async () => {
			const id = unwrap(await service.createGiftCard(card, admin));
			expect(unwrap(await service.getGiftCard(id, admin)).code).toMatch(/^[0-9A-F]{16}$/);

			unwrap(await service.createGiftCard({ ...card, code: 'DUPLICATE1' }, admin));
			const dup = await service.createGiftCard({ ...card, code: 'duplicate1' }, admin);
			expect(dup.ok).toBe(false);
			if (!dup.ok) expect(dup.error.status).toBe(409);
		});

		test('customers see cards addressed to their email, without internal fields', async () => {
			unwrap(await service.createGiftCard({ ...card, recipientEmail: 'ada@example.test' }, admin));
			unwrap(await service.createGiftCard({ ...card, recipientEmail: 'bob@example.test' }, admin));

			const mine = unwrap(await service.listMyGiftCards('ada@example.test', ada));
			expect(mine).toHaveLength(1);
			expect(mine[0]).not.toHaveProperty('recipientEmail');
			expect(unwrap(await service.listMyGiftCards(null, bob))).toEqual([]);
			expect((await service.listMyGiftCards(null, null)).ok).toBe(false);
		});
	});

	describe('newsletter contract', () => {
		test('public sign-up creates, then resubscribes the same email', async () => {
			const first = unwrap(await service.subscribe('ada@example.test', null, 'footer'));
			expect(first).toMatchObject({ status: 'subscribed', source: 'footer', userId: null });

			unwrap(await service.setSubscriptionStatus(first.id, 'unsubscribed', admin));
			const again = unwrap(await service.subscribe('ada@example.test', ada.id, 'footer'));
			expect(again).toMatchObject({ id: first.id, status: 'subscribed', userId: ada.id });
			expect(unwrap(await service.listSubscriptions({ page: 1, pageSize: 10 }, admin)).total).toBe(
				1
			);
		});

		test('customers read and change only their own subscription', async () => {
			expect(unwrap(await service.getMySubscription('ada@example.test', ada))).toBeNull();
			const missing = await service.setMySubscriptionStatus('unsubscribed', ada);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);

			unwrap(await service.subscribe('ada@example.test', ada.id, 'account'));
			expect(unwrap(await service.getMySubscription('ada@example.test', ada))).toMatchObject({
				status: 'subscribed'
			});
			expect(unwrap(await service.setMySubscriptionStatus('unsubscribed', ada)).status).toBe(
				'unsubscribed'
			);
			expect(unwrap(await service.getMySubscription('bob@example.test', bob))).toBeNull();
		});

		test('admin filters by status and reports unknown subscriptions', async () => {
			const row = unwrap(await service.subscribe('ada@example.test', null, 'footer'));
			unwrap(await service.setSubscriptionStatus(row.id, 'unsubscribed', admin));
			expect(
				unwrap(
					await service.listSubscriptions({ page: 1, pageSize: 10, status: 'subscribed' }, admin)
				).total
			).toBe(0);
			const missing = await service.setSubscriptionStatus('nope', 'subscribed', admin);
			expect(missing.ok).toBe(false);
		});
	});
}
