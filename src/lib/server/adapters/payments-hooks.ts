import type { Actor } from '#shared';
import type { CatalogServices } from '#modules/catalog/server.ts';
import type { OrdersServices } from '#modules/orders/server.ts';
import type { PaymentsHooks } from '#modules/payments/server.ts';

/** Internal actor for reading order lines during automated expiry; never exposed to requests. */
const SYSTEM_ACTOR: Actor = {
	id: 'system:payments',
	role: 'admin',
	permissions: new Set(['admin:access'])
};

/**
 * When an unpaid payment lapses: cancel its order and put the reserved stock back.
 * Lives in the runtime because it spans the orders and catalog modules.
 */
export function createPaymentsHooks(
	orders: Pick<OrdersServices, 'orders'>,
	catalog: Pick<CatalogServices, 'inventory'>
): PaymentsHooks {
	return {
		async onExpired(orderId) {
			const detail = await orders.orders.getOrder(orderId, SYSTEM_ACTOR);
			const cancelled = await orders.orders.cancelOrder(orderId, 'Payment window expired');
			if (!cancelled.ok) {
				console.error('[payments] order cancel failed', cancelled.error);
				return;
			}
			if (!detail.ok) return;

			const lines = detail.value.items.flatMap((item) =>
				item.variantId ? [{ variantId: item.variantId, quantity: item.quantity }] : []
			);
			const released = await catalog.inventory.release(lines, { type: 'order', id: orderId });
			if (!released.ok) console.error('[payments] stock release failed', released.error);
		}
	};
}
