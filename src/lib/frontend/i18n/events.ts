import * as messages from '#lib/paraglide/messages.js';
import { statusLabel } from './labels.ts';

interface TimelineEventLike {
	type?: string | null;
	message?: string | null;
}

/**
 * Order timeline messages are stored in the database as English sentences written by the server.
 * Known sentences are recognised here and rendered in the current locale; notes typed by admins
 * and anything unrecognised are returned unchanged.
 */
const PATTERNS: Array<{
	test: RegExp;
	render: (match: RegExpMatchArray) => string;
}> = [
	{ test: /^Order placed$/, render: () => messages.labels_event_order_placed() },
	{ test: /^Payment verified$/, render: () => messages.labels_event_payment_verified() },
	{ test: /^QRIS payment verified$/, render: () => messages.labels_event_qris_payment_verified() },
	{
		test: /^Order cancelled: Payment window expired$/,
		render: () => messages.labels_event_cancelled_payment_expired()
	},
	{
		test: /^Order cancelled: Checkout failed$/,
		render: () => messages.labels_event_cancelled_checkout_failed()
	},
	{
		test: /^Order cancelled: (.+)$/s,
		render: (match) => messages.labels_event_cancelled({ reason: match[1] ?? '' })
	},
	{
		test: /^Status changed from (\S+) to (\S+)$/,
		render: (match) =>
			messages.labels_event_status_change({
				from: statusLabel('order', match[1]),
				to: statusLabel('order', match[2])
			})
	},
	{
		test: /^Shipped with (.+) \((.*)\)$/s,
		render: (match) =>
			messages.labels_event_shipped({ carrier: match[1] ?? '', tracking: match[2] ?? '' })
	},
	{
		test: /^Return (\S+) moved from (\S+) to (\S+)$/,
		render: (match) =>
			messages.labels_event_return_moved({
				id: match[1] ?? '',
				from: statusLabel('return', match[2]),
				to: statusLabel('return', match[3])
			})
	},
	{
		test: /^Return (\S+) updated$/,
		render: (match) => messages.labels_event_return_updated({ id: match[1] ?? '' })
	},
	{
		test: /^Payment proof rejected \((.+)\)\. Please upload a new proof\.$/,
		render: (match) =>
			messages.labels_event_payment_proof_rejected({
				reason: statusLabel('reject_reason', (match[1] ?? '').replaceAll(' ', '_'))
			})
	}
];

/** Localised text of an order timeline event; `null` when the event carries no message. */
export function timelineMessage(event: TimelineEventLike): string | null {
	const text = event.message?.trim();
	if (!text) return null;
	for (const { test, render } of PATTERNS) {
		const match = text.match(test);
		if (match) return render(match);
	}
	return text;
}
