import { m } from '#lib/paraglide/messages.js';
import type { AccountDetail, AccountFormField } from './models.ts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{4,30}$/;
const NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Client-side mirror of the server's account details check, so buyers see
 * errors per field before reaching payment. Returns errors keyed by field id.
 */
export function validateAccountForm(
	fields: AccountFormField[],
	values: Record<string, string>
): Record<string, string> {
	const errors: Record<string, string> = {};

	for (const field of fields) {
		const value = (values[field.id] ?? '').trim();

		if (!value) {
			if (field.required) errors[field.id] = m.checkout_account_field_required();
			continue;
		}

		const tooLong = value.length > (field.type === 'textarea' ? 1000 : 200);
		const invalid =
			tooLong ||
			(field.type === 'email' && !EMAIL.test(value)) ||
			(field.type === 'tel' && !PHONE.test(value)) ||
			(field.type === 'number' && !NUMBER.test(value)) ||
			(field.type === 'select' && !field.options.includes(value));

		if (invalid) errors[field.id] = m.checkout_account_field_invalid();
	}

	return errors;
}

/** Whether the stored values pass the form (used to guard the payment step). */
export function isAccountFormComplete(
	fields: AccountFormField[],
	values: Record<string, string>
): boolean {
	return Object.keys(validateAccountForm(fields, values)).length === 0;
}

/** Trimmed, non-empty values for the configured fields only. */
export function accountFormPayload(
	fields: AccountFormField[],
	values: Record<string, string>
): Record<string, string> {
	const payload: Record<string, string> = {};
	for (const field of fields) {
		const value = (values[field.id] ?? '').trim();
		if (value) payload[field.id] = value;
	}
	return payload;
}

/**
 * Reads the account details snapshot a top-up order stores in place of its
 * shipping address (`{ type: 'account', accountDetails: [...] }`), or `null`
 * for a regular address.
 */
export function readAccountDetails(value: unknown): AccountDetail[] | null {
	let source = value;
	if (typeof source === 'string') {
		try {
			source = JSON.parse(source);
		} catch {
			return null;
		}
	}
	if (typeof source !== 'object' || source === null) return null;

	const record = source as Record<string, unknown>;
	if (record.type !== 'account' || !Array.isArray(record.accountDetails)) return null;

	return record.accountDetails.flatMap((entry: unknown) => {
		if (typeof entry !== 'object' || entry === null) return [];
		const { id, label, value: detail } = entry as Record<string, unknown>;
		return typeof label === 'string' && typeof detail === 'string'
			? [{ id: typeof id === 'string' ? id : label, label, value: detail }]
			: [];
	});
}
