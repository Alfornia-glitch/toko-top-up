import { UnprocessableError } from '#shared';

export interface CheckoutInput {
	/** Required for the address flow; ignored when the store asks for account details. */
	addressId?: string | null | undefined;
	shippingId?: string | null | undefined;
	/** Values for the admin-configured account form, keyed by field id (top-up flow). */
	accountDetails?: Record<string, string> | null | undefined;
	note?: string | null | undefined;
	/** 'qris' leaves the order pending until a verified payment marks it paid; anything else is the legacy instant path. */
	paymentMode?: string | undefined;
}

export interface PlacedOrder {
	orderId: string;
	orderNumber: string;
}

export interface ShippingMethod {
	id: string;
	price: number;
}

/**
 * Port over the storefront settings checkout depends on (shipping methods and
 * the default currency). Those live in site settings, so the runtime supplies the adapter.
 */
export interface CheckoutSettings {
	getShippingMethod(id: string): Promise<ShippingMethod | null>;
	getCurrency(): Promise<string>;
	/**
	 * The account details form when the store sells top-ups (no delivery address
	 * or shipping), or `null` for the regular address + shipping flow.
	 */
	getAccountForm(): Promise<AccountFormField[] | null>;
}

export type AccountFieldType = 'text' | 'number' | 'email' | 'tel' | 'select' | 'textarea';

export interface AccountFormField {
	id: string;
	label: string;
	type: AccountFieldType;
	required: boolean;
	options: string[];
}

export interface AccountDetail {
	id: string;
	label: string;
	value: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{4,30}$/;
const NUMBER = /^-?\d+(\.\d+)?$/;

function invalid(field: AccountFormField): never {
	throw new UnprocessableError(`Invalid value for ${field.label}`, {
		messageKey: 'account_detail_invalid',
		params: { field: field.label }
	});
}

/**
 * Checks submitted values against the configured form and returns the
 * snapshot to store on the order, in form order. Unknown keys are dropped and
 * empty optional fields are left out.
 */
export function validateAccountDetails(
	fields: AccountFormField[],
	values: Record<string, string> | null | undefined
): AccountDetail[] {
	const details: AccountDetail[] = [];

	for (const field of fields) {
		const raw = values?.[field.id];
		const value = typeof raw === 'string' ? raw.trim() : '';

		if (!value) {
			if (field.required) {
				throw new UnprocessableError(`${field.label} is required`, {
					messageKey: 'account_detail_required',
					params: { field: field.label }
				});
			}
			continue;
		}

		if (value.length > (field.type === 'textarea' ? 1000 : 200)) invalid(field);
		if (field.type === 'email' && !EMAIL.test(value)) invalid(field);
		if (field.type === 'tel' && !PHONE.test(value)) invalid(field);
		if (field.type === 'number' && !NUMBER.test(value)) invalid(field);
		if (field.type === 'select' && !field.options.includes(value)) invalid(field);

		details.push({ id: field.id, label: field.label, value });
	}

	return details;
}

export interface OrderLine {
	productId: string;
	variantId: string;
	productNameSnapshot: string;
	skuSnapshot: string;
	imageUrlSnapshot: string | null;
	quantity: number;
	unitPrice: number;
	total: number;
}
