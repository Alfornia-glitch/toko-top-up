import * as messages from '#lib/paraglide/messages.js';

type MessageFn = (inputs?: Record<string, unknown>) => string;

/**
 * Looks up a message by a key built at runtime (enum values, server error codes). Returns `null`
 * when the key does not exist so callers can fall back. Prefer a static `m.some_key()` call
 * whenever the key is known at write time (it is type checked and tree-shaken).
 */
export function translateKey(key: string, params?: Record<string, unknown>): string | null {
	const fn = (messages as unknown as Record<string, MessageFn | undefined>)[key];
	return typeof fn === 'function' ? fn(params) : null;
}
