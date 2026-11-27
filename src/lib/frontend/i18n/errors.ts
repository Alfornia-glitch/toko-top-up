import { translateKey } from './dynamic.ts';

interface ErrorLike {
	code?: unknown;
	params?: unknown;
	message?: unknown;
	error?: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

/**
 * Turns an API failure into a translated message.
 *
 * Accepts an `ApiError` (from `apiFetch` / `api.*`), a parsed error body
 * `{ error, code, params }`, any `Error`, or a string. Resolution order:
 *
 * 1. `errors_<code>` (code lower-cased, e.g. `CONFLICT` -> `errors_conflict`, `cart_empty` ->
 *    `errors_cart_empty`), interpolating `params`;
 * 2. the server's own message (`error` / `message`) when there is no translation;
 * 3. `fallbackKey`, a message key such as `'account_orders_load_failed'`, then
 *    `errors_request_failed`.
 *
 * Network failures (`TypeError` from `fetch`) map to `errors_network`.
 */
export function errorMessage(source: unknown, fallbackKey?: string): string {
	const record = asRecord(source) as ErrorLike | null;
	const code = typeof record?.code === 'string' && record.code ? record.code : null;
	const params = asRecord(record?.params) ?? undefined;

	if (code) {
		const translated = translateKey(`errors_${code.toLowerCase()}`, params);
		if (translated) return translated;
	}

	if (source instanceof TypeError) return translateKey('errors_network') ?? '';

	const serverMessage =
		typeof record?.error === 'string' && record.error
			? record.error
			: typeof record?.message === 'string' && record.message
				? record.message
				: typeof source === 'string'
					? source
					: '';
	if (serverMessage) return serverMessage;

	return (
		(fallbackKey ? translateKey(fallbackKey) : null) ?? translateKey('errors_request_failed') ?? ''
	);
}
