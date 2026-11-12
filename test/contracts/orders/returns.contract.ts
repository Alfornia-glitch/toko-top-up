import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap, type Actor } from '#shared';
import type { OrdersService, ReturnsService } from '#modules/orders/server.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface ReturnsContractContext {
	returns: ReturnsService;
	orders: OrdersService;
	clock: TestClock;
	reset(): Promise<void>;
}

export function runReturnsContract({
	returns,
	orders,
	clock,
	reset
}: ReturnsContractContext): void {
	const ada: Actor = createForbiddenActor('user-ada');
	const bob: Actor = createForbiddenActor('user-bob');
	const admin = createAdminActor('user-admin');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	async function orderWithItem(userId: string) {
		const created = unwrap(
			await orders.createOrder({
				userId,
				status: 'delivered',
				paymentStatus: 'paid',
				subtotalCents: 2000,
				discountCents: 0,
				shippingCents: 0,
				taxCents: 0,
				grandTotalCents: 2000,
				currency: 'USD',
				couponId: null,
				shippingAddress: {},
				billingAddress: {},
				notes: null,
				items: [
					{
						productId: 'p1',
						variantId: 'v1',
						productNameSnapshot: 'Widget',
						skuSnapshot: 'W-1',
						imageUrlSnapshot: null,
						quantity: 2,
						unitPriceCents: 1000,
						totalCents: 2000
					}
				],
				payment: { provider: 'mock', status: 'succeeded' }
			})
		);
		const detail = unwrap(await orders.getOrder(created.orderId, admin));
		return { ...created, itemId: detail.items[0]!.id };
	}

	const request = (orderItemId: string) => ({
		orderItemId,
		type: 'return' as const,
		reason: 'Too small',
		note: 'Please collect',
		resolution: 'original_payment' as const
	});

	describe('customer returns', () => {
		test('requests a return for their own order item', async () => {
			const order = await orderWithItem('user-ada');
			const created = unwrap(await returns.createReturn(request(order.itemId), ada));

			expect(created).toMatchObject({
				orderId: order.orderId,
				orderNumber: order.orderNumber,
				productName: 'Widget',
				sku: 'W-1',
				status: 'requested',
				type: 'return',
				resolution: 'original_payment',
				note: 'Please collect',
				images: []
			});
			expect(unwrap(await returns.listMyReturns(ada)).map((r) => r.id)).toEqual([created.id]);
			expect(unwrap(await returns.getMyReturn(created.id, ada)).id).toBe(created.id);
		});

		test('other customers’ items and requests are not found; anonymous is rejected', async () => {
			const order = await orderWithItem('user-ada');
			const created = unwrap(await returns.createReturn(request(order.itemId), ada));

			for (const result of [
				await returns.createReturn(request(order.itemId), bob),
				await returns.createReturn(request('missing'), ada),
				await returns.getMyReturn(created.id, bob)
			]) {
				expect(result.ok).toBe(false);
				if (!result.ok) expect(result.error.status).toBe(404);
			}
			expect(unwrap(await returns.listMyReturns(bob))).toEqual([]);
			expect((await returns.listMyReturns(null)).ok).toBe(false);
		});
	});

	describe('admin returns desk', () => {
		test('lists with customer email, filters and searches', async () => {
			const a = await orderWithItem('user-ada');
			const b = await orderWithItem('user-bob');
			const first = unwrap(await returns.createReturn(request(a.itemId), ada));
			const second = unwrap(
				await returns.createReturn({ ...request(b.itemId), type: 'exchange' }, bob)
			);
			unwrap(await returns.updateReturn(first.id, { status: 'approved' }, admin));

			const all = unwrap(await returns.listReturns({ page: 1, pageSize: 10 }, admin));
			expect(all.total).toBe(2);
			expect(all.data.find((r) => r.id === first.id)).toMatchObject({
				customerEmail: 'ada@example.test',
				userId: 'user-ada'
			});

			const approved = unwrap(
				await returns.listReturns({ page: 1, pageSize: 10, status: 'approved' }, admin)
			);
			expect(approved.data.map((r) => r.id)).toEqual([first.id]);
			const exchanges = unwrap(
				await returns.listReturns({ page: 1, pageSize: 10, type: 'exchange' }, admin)
			);
			expect(exchanges.data.map((r) => r.id)).toEqual([second.id]);
			const byEmail = unwrap(
				await returns.listReturns({ page: 1, pageSize: 10, q: 'bob@' }, admin)
			);
			expect(byEmail.data.map((r) => r.id)).toEqual([second.id]);
			const byProduct = unwrap(
				await returns.listReturns({ page: 1, pageSize: 10, q: 'Widget' }, admin)
			);
			expect(byProduct.total).toBe(2);
		});

		test('walks a return through its statuses and records the order timeline', async () => {
			const order = await orderWithItem('user-ada');
			const created = unwrap(await returns.createReturn(request(order.itemId), ada));

			const bad = await returns.updateReturn(created.id, { status: 'refunded' }, admin);
			expect(bad.ok).toBe(false);
			if (!bad.ok) {
				expect(bad.error).toMatchObject({
					status: 422,
					message: 'Cannot move a return from "requested" to "refunded"'
				});
			}

			unwrap(await returns.updateReturn(created.id, { status: 'approved' }, admin));
			unwrap(await returns.updateReturn(created.id, { status: 'received' }, admin));
			clock.set(new Date('2026-01-03T00:00:00.000Z'));
			const refunded = unwrap(
				await returns.updateReturn(
					created.id,
					{ status: 'refunded', refundAmountCents: 1000, note: 'Refunded half' },
					admin
				)
			);

			expect(refunded).toMatchObject({
				status: 'refunded',
				refundAmountCents: 1000,
				note: 'Refunded half',
				resolvedBy: 'user-admin',
				resolvedAt: new Date('2026-01-03T00:00:00.000Z'),
				customerName: 'Ada',
				quantity: 2,
				unitPriceCents: 1000
			});

			const timeline = unwrap(await orders.getOrder(order.orderId, admin)).events.filter(
				(e) => e.type === 'return_update'
			);
			expect(timeline).toHaveLength(3);
			expect(timeline.map((e) => e.message)).toContain(
				`Return ${created.id} moved from received to refunded`
			);
		});

		test('requires admin access and reports unknown returns', async () => {
			const denied = await returns.listReturns({ page: 1, pageSize: 10 }, ada);
			expect(denied.ok).toBe(false);
			if (!denied.ok) expect(denied.error.status).toBe(403);

			const missing = await returns.getReturn('nope', admin);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);
		});
	});
}
