import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap, type Actor } from '#shared';
import type { OrdersService } from '#modules/orders/server.ts';
import type { CreateOrderInput } from '#modules/orders/index.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface OrdersContractContext {
	service: OrdersService;
	clock: TestClock;
	reset(): Promise<void>;
}

function input(userId: string, overrides: Partial<CreateOrderInput> = {}): CreateOrderInput {
	return {
		userId,
		status: 'paid',
		paymentStatus: 'paid',
		subtotalCents: 3000,
		discountCents: 0,
		shippingCents: 500,
		taxCents: 0,
		grandTotalCents: 3500,
		currency: 'USD',
		couponId: null,
		shippingAddress: { line1: '1 Main St', city: 'Jakarta' },
		billingAddress: { line1: '1 Main St', city: 'Jakarta' },
		notes: null,
		items: [
			{
				productId: 'p1',
				variantId: 'v1',
				productNameSnapshot: 'Widget',
				skuSnapshot: 'W-1',
				imageUrlSnapshot: null,
				quantity: 2,
				unitPriceCents: 1500,
				totalCents: 3000
			}
		],
		payment: { provider: 'mock', status: 'succeeded' },
		...overrides
	};
}

export function runOrdersContract({ service, clock, reset }: OrdersContractContext): void {
	const ada: Actor = createForbiddenActor('user-ada');
	const bob: Actor = createForbiddenActor('user-bob');
	const admin = createAdminActor('user-admin');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	async function place(userId = 'user-ada', overrides: Partial<CreateOrderInput> = {}) {
		return unwrap(await service.createOrder(input(userId, overrides)));
	}

	describe('placing orders', () => {
		test('creates an order with items, a placed event and a payment', async () => {
			const created = await place('user-ada', { orderId: 'order-fixed' });
			expect(created.orderId).toBe('order-fixed');
			expect(created.orderNumber).toMatch(/^SX-[0-9A-Z]+-[0-9A-Z]{4}$/);

			const order = unwrap(await service.getOrder('order-fixed', admin));
			expect(order).toMatchObject({
				orderNumber: created.orderNumber,
				status: 'paid',
				grandTotalCents: 3500,
				customerName: 'Ada',
				customerEmail: 'ada@example.test',
				shippingAddressJson: { city: 'Jakarta' }
			});
			expect(order.items).toHaveLength(1);
			expect(order.items[0]).toMatchObject({ productNameSnapshot: 'Widget', quantity: 2 });
			expect(order.events.map((e) => e.type)).toEqual(['placed']);
			expect(order.payments[0]).toMatchObject({
				provider: 'mock',
				status: 'succeeded',
				amountCents: 3500,
				paidAt: START
			});
		});

		test('order numbers are unique even within the same millisecond', async () => {
			const first = await place();
			const second = await place();
			expect(second.orderNumber).not.toBe(first.orderNumber);
		});
	});

	describe('customer views', () => {
		test('lists and reads only the customer’s own orders', async () => {
			const mine = await place('user-ada');
			await place('user-bob');

			const list = unwrap(await service.listMyOrders({ page: 1, pageSize: 10 }, ada));
			expect(list.total).toBe(1);
			expect(list.data[0]).toMatchObject({ id: mine.orderId, itemCount: 1 });

			const byNumber = unwrap(await service.getMyOrder(mine.orderNumber, ada));
			const byId = unwrap(await service.getMyOrder(mine.orderId, ada));
			expect(byNumber.id).toBe(byId.id);
			expect(byNumber.items[0]).toMatchObject({ productName: 'Widget', sku: 'W-1' });
			expect(byNumber).not.toHaveProperty('userId');

			const foreign = await service.getMyOrder(mine.orderNumber, bob);
			expect(foreign.ok).toBe(false);
			if (!foreign.ok) expect(foreign.error.status).toBe(404);
			expect((await service.listMyOrders({ page: 1, pageSize: 10 }, null)).ok).toBe(false);
		});
	});

	describe('admin back office', () => {
		test('lists with customers, filters, searches and sorts', async () => {
			const cheap = await place('user-ada', { grandTotalCents: 1000, status: 'pending' });
			const dear = await place('user-bob', { grandTotalCents: 9000 });

			const all = unwrap(await service.listOrders({ page: 1, pageSize: 10, sort: 'total' }, admin));
			expect(all.total).toBe(2);
			expect(all.data.map((o) => o.id)).toEqual([cheap.orderId, dear.orderId]);
			expect(all.data[0]).toMatchObject({ customerName: 'Ada', customerEmail: 'ada@example.test' });

			const desc = unwrap(
				await service.listOrders({ page: 1, pageSize: 10, sort: '-total' }, admin)
			);
			expect(desc.data[0]?.id).toBe(dear.orderId);

			const pending = unwrap(
				await service.listOrders({ page: 1, pageSize: 10, status: 'pending' }, admin)
			);
			expect(pending.data.map((o) => o.id)).toEqual([cheap.orderId]);

			const byEmail = unwrap(await service.listOrders({ page: 1, pageSize: 10, q: 'bob@' }, admin));
			expect(byEmail.data.map((o) => o.id)).toEqual([dear.orderId]);
			const byNumber = unwrap(
				await service.listOrders({ page: 1, pageSize: 10, q: cheap.orderNumber }, admin)
			);
			expect(byNumber.data.map((o) => o.id)).toEqual([cheap.orderId]);
		});

		test('moves an order through allowed statuses and records the timeline', async () => {
			const { orderId } = await place();

			const processing = unwrap(
				await service.updateOrder(orderId, { status: 'processing', note: 'Packing' }, admin)
			);
			expect(processing.status).toBe('processing');
			expect(processing.events.map((e) => e.type).sort()).toEqual([
				'note',
				'placed',
				'status_change'
			]);

			const bad = await service.updateOrder(orderId, { status: 'delivered' }, admin);
			expect(bad.ok).toBe(false);
			if (!bad.ok) {
				expect(bad.error).toMatchObject({
					status: 422,
					message: 'Cannot move an order from "processing" to "delivered"'
				});
			}

			const refunded = unwrap(await service.updateOrder(orderId, { status: 'refunded' }, admin));
			expect(refunded).toMatchObject({ status: 'refunded', paymentStatus: 'refunded' });
		});

		test('ships paid orders and refuses pending ones', async () => {
			const pending = await place('user-ada', { status: 'pending', paymentStatus: 'pending' });
			const refused = await service.createShipment(
				pending.orderId,
				{ carrier: 'JNE', trackingNumber: 'T1' },
				admin
			);
			expect(refused.ok).toBe(false);
			if (!refused.ok)
				expect(refused.error.message).toBe('Cannot ship an order with status "pending"');

			const paid = await place();
			const shipped = unwrap(
				await service.createShipment(paid.orderId, { carrier: 'JNE', trackingNumber: 'T2' }, admin)
			);
			expect(shipped.order).toMatchObject({
				status: 'shipped',
				fulfillmentStatus: 'fulfilled',
				carrier: 'JNE',
				trackingNumber: 'T2'
			});
			expect(shipped.order.shipments[0]).toMatchObject({
				id: shipped.shipmentId,
				status: 'shipped'
			});
			expect(shipped.order.events.some((e) => e.type === 'shipment')).toBe(true);
		});

		test('requires admin access and reports unknown orders', async () => {
			const denied = await service.listOrders({ page: 1, pageSize: 10 }, ada);
			expect(denied.ok).toBe(false);
			if (!denied.ok) expect(denied.error.status).toBe(403);

			const missing = await service.getOrder('nope', admin);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);
		});
	});

	describe('platform reads', () => {
		test('totals count revenue orders and a user’s orders, and find products on orders', async () => {
			await place('user-ada', {
				status: 'pending',
				paymentStatus: 'pending',
				grandTotalCents: 500
			});
			await place('user-ada', { grandTotalCents: 3000 });
			await place('user-bob', { status: 'shipped', grandTotalCents: 2000 });

			expect(unwrap(await service.getTotals(admin))).toEqual({
				orderCount: 3,
				pendingCount: 1,
				paidCount: 2,
				revenueCents: 5000
			});
			expect(unwrap(await service.getUserOrderCount('user-ada', admin))).toBe(2);
			expect(unwrap(await service.getUserOrderCount('nobody', admin))).toBe(0);

			const totals = unwrap(await service.getUserTotals(['user-ada', 'user-bob', 'nobody'], admin));
			expect(totals.sort((a, b) => a.userId.localeCompare(b.userId))).toEqual([
				{ userId: 'user-ada', orderCount: 2, spentCents: 3500 },
				{ userId: 'user-bob', orderCount: 1, spentCents: 2000 }
			]);
			expect(unwrap(await service.getUserTotals([], admin))).toEqual([]);

			const adaOrders = unwrap(await service.listUserOrders('user-ada', admin));
			expect(adaOrders).toHaveLength(2);
			expect(adaOrders.every((o) => o.userId === 'user-ada')).toBe(true);

			expect(unwrap(await service.getProductIdsWithItems(['p1', 'p9'], admin))).toEqual(['p1']);
			expect(unwrap(await service.getProductIdsWithItems([], admin))).toEqual([]);

			for (const result of [
				await service.getTotals(ada),
				await service.getUserOrderCount('user-ada', ada),
				await service.getProductIdsWithItems(['p1'], ada),
				await service.getUserTotals(['user-ada'], ada),
				await service.listUserOrders('user-ada', ada)
			]) {
				expect(result.ok).toBe(false);
			}
		});
	});

	describe('compensation', () => {
		test('cancelling refunds the payment, records why, and is idempotent', async () => {
			const { orderId } = await place();
			unwrap(await service.cancelOrder(orderId, 'Coupon exhausted'));
			unwrap(await service.cancelOrder(orderId, 'Again'));

			const order = unwrap(await service.getOrder(orderId, admin));
			expect(order).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded' });
			expect(order.payments[0]).toMatchObject({
				status: 'refunded',
				failureReason: 'Coupon exhausted'
			});
			expect(order.events.filter((e) => e.type === 'status_change')).toHaveLength(1);

			const missing = await service.cancelOrder('nope', 'x');
			expect(missing.ok).toBe(false);
		});
	});
}
