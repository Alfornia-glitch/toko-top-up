import { NotFoundError, err, ok, type Actor } from '#shared';
import type { OrdersServices } from '#modules/orders/server.ts';

export interface FakeOrder {
	id: string;
	userId: string;
	orderNumber: string;
	status: string;
	currency: string;
	grandTotal: number;
	notes: string[];
}

/** In-memory stand-in for the orders module, covering only what payments calls. */
export function createFakeOrders() {
	const store = new Map<string, FakeOrder>();
	const markPaidCalls: string[] = [];

	const orders = {
		async getMyOrder(id: string, actor: Actor | null) {
			const order = store.get(id);
			if (!order || order.userId !== actor?.id) return err(new NotFoundError('Order not found'));
			return ok(order);
		},
		async getOrder(id: string) {
			const order = store.get(id);
			if (!order) return err(new NotFoundError('Order not found'));
			return ok({ ...order, customer: { id: order.userId, name: 'Buyer', email: 'b@x.test' } });
		},
		async markPaid(id: string) {
			markPaidCalls.push(id);
			const order = store.get(id);
			if (order && order.status === 'pending') order.status = 'paid';
			return ok(undefined);
		},
		async updateOrder(id: string, input: { note?: string | null }) {
			const order = store.get(id);
			if (order && input.note) order.notes.push(input.note);
			return ok(order);
		}
	};

	return {
		services: { orders } as unknown as Pick<OrdersServices, 'orders'>,
		markPaidCalls,
		add(order: Partial<FakeOrder> & { id: string; userId: string }): FakeOrder {
			const full: FakeOrder = {
				orderNumber: `SX-${order.id}`,
				status: 'pending',
				currency: 'IDR',
				grandTotal: 150_000,
				notes: [],
				...order
			};
			store.set(full.id, full);
			return full;
		},
		get: (id: string) => store.get(id)
	};
}
