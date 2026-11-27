import { m } from '#lib/paraglide/messages.js';
import { translateKey } from './dynamic.ts';

/**
 * Translated labels for enum values that the API returns as raw strings. Messages live in
 * `messages/labels/{id,en}.json` under `labels_<kind>_<value>`. To add a value, add the key in
 * both files; unknown values fall back to a humanised version of the raw value.
 */
export type LabelKind =
	| 'order'
	| 'payment'
	| 'fulfillment'
	| 'return'
	| 'ticket'
	| 'priority'
	| 'gift_card'
	| 'gift_card_tx'
	| 'coupon'
	| 'coupon_type'
	| 'newsletter'
	| 'product'
	| 'review'
	| 'cart'
	| 'return_type'
	| 'return_resolution'
	| 'payment_type'
	| 'reject_reason'
	| 'role'
	| 'audit_action'
	| 'danger_action'
	| 'misc';

function humanise(value: string): string {
	const text = value.replaceAll(/[_.]+/g, ' ').trim();
	return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** Translated label for `value` of the given enum `kind`, e.g. `enumLabel('order', 'shipped')`. */
export function enumLabel(kind: LabelKind, value: string | null | undefined): string {
	if (!value) return '';
	const key = `labels_${kind}_${value.replaceAll('.', '_').toLowerCase()}`;
	return translateKey(key) ?? humanise(value);
}

/**
 * Status label for order / payment / fulfillment / return / ticket / gift_card / coupon /
 * newsletter / product / review / cart statuses.
 */
export function statusLabel(kind: LabelKind, value: string | null | undefined): string;
/** @deprecated Legacy overload for the `*_STATUS_LABELS` maps in `content/status.ts`. */
export function statusLabel(map: Record<string, string>, value: string | null | undefined): string;
export function statusLabel(
	kindOrMap: LabelKind | Record<string, string>,
	value: string | null | undefined
): string {
	if (!value) return '';
	if (typeof kindOrMap === 'string') return enumLabel(kindOrMap, value);
	return kindOrMap[value] ?? humanise(value);
}

const GENERIC_STATUS_KINDS: readonly LabelKind[] = [
	'order',
	'payment',
	'return',
	'ticket',
	'fulfillment',
	'gift_card',
	'coupon',
	'newsletter',
	'product',
	'review',
	'cart',
	'misc'
];

/** Status label when the kind is unknown (generic badges): first kind that defines the value. */
export function anyStatusLabel(value: string | null | undefined): string {
	if (!value) return '';
	for (const kind of GENERIC_STATUS_KINDS) {
		const text = translateKey(`labels_${kind}_${value.toLowerCase()}`);
		if (text) return text;
	}
	return humanise(value);
}

export const roleLabel = (role: string | null | undefined) => enumLabel('role', role);
export const priorityLabel = (value: string | null | undefined) => enumLabel('priority', value);
export const paymentTypeLabel = (value: string | null | undefined) =>
	enumLabel('payment_type', value);
/** Audit log `action`, e.g. `user.set_role` -> "Changed user role". */
export const auditActionLabel = (action: string | null | undefined) =>
	enumLabel('audit_action', action);
export const dangerActionLabel = (action: string | null | undefined) =>
	enumLabel('danger_action', action);

/**
 * English text of the built-in shipping methods (`storefront/domain/site-settings.ts`). A stored
 * label is translated only while it still equals this text, so admin edits are shown unchanged.
 */
const DEFAULT_SHIPPING_TEXT: Record<string, { label: string; description: string }> = {
	standard: { label: 'Standard', description: 'Get your product in 1 week' },
	express: { label: 'Express', description: 'Get your product in 0-1 days' },
	basic: { label: 'Basic', description: 'Get your product in 3-4 days' }
};

/** Shipping method name, e.g. `shippingLabel(option)` -> "Reguler" in Indonesian. */
export function shippingLabel(method: { id: string; label: string }): string {
	const known = DEFAULT_SHIPPING_TEXT[method.id];
	if (!known || known.label !== method.label) return method.label;
	return translateKey(`labels_shipping_${method.id}`) ?? method.label;
}

/** Shipping method delivery text; same rule as `shippingLabel`. */
export function shippingDescription(method: { id: string; description: string }): string {
	const known = DEFAULT_SHIPPING_TEXT[method.id];
	if (!known || known.description !== method.description) return method.description;
	return translateKey(`labels_shipping_${method.id}_desc`) ?? method.description;
}

/** Generic fallback label used when a value is missing entirely. */
export const unknownLabel = () => m.labels_misc_unknown();
