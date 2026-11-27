import { enumLabel, statusLabel, type LabelKind } from '#lib/frontend/i18n/labels.ts';

export { statusLabel };

/**
 * Legacy `Record<string, string>` maps kept for existing call sites
 * (`statusLabel(ORDER_STATUS_LABELS, value)`). Values resolve lazily through the getter, so they
 * follow the current locale. New code should call `statusLabel('order', value)` directly.
 */
function lazyMap(kind: LabelKind, values: readonly string[]): Record<string, string> {
	const map: Record<string, string> = {};
	for (const value of values) {
		Object.defineProperty(map, value, {
			enumerable: true,
			get: () => enumLabel(kind, value)
		});
	}
	return map;
}

export const ORDER_STATUS_LABELS = lazyMap('order', [
	'pending',
	'paid',
	'processing',
	'shipped',
	'delivered',
	'cancelled',
	'refunded'
]);

export const RETURN_STATUS_LABELS = lazyMap('return', [
	'pending',
	'requested',
	'approved',
	'rejected',
	'in_transit',
	'received',
	'completed',
	'cancelled',
	'refunded'
]);

export const TICKET_STATUS_LABELS = lazyMap('ticket', [
	'open',
	'pending',
	'in_progress',
	'resolved',
	'closed'
]);

export const PAYMENT_STATUS_LABELS = lazyMap('payment', [
	'pending',
	'authorized',
	'paid',
	'failed',
	'cancelled',
	'refunded',
	'partially_refunded'
]);
