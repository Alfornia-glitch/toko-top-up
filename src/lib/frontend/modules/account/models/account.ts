export type {
	Address,
	GiftCardSummary,
	NewsletterSubscription,
	OrderDetail,
	OrderSummary,
	PaymentMethod,
	ReturnDetail,
	ReturnSummary,
	SupportTicketDetail,
	SupportTicketSummary,
	WishlistItem
} from '#lib/frontend/modules/commerce/models.ts';

export interface DataEnvelope<T> {
	data: T;
}

export interface PagedEnvelope<T> extends DataEnvelope<T[]> {
	page: number;
	pageSize: number;
	total: number;
}

export interface AddressInput {
	label: string | null;
	recipientName: string;
	phone: string | null;
	line1: string;
	line2: string | null;
	city: string;
	region: string | null;
	postalCode: string | null;
	country: string;
	isDefaultShipping: boolean;
	isDefaultBilling: boolean;
}

export interface PaymentMethodInput {
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
	isDefault: boolean;
}

export interface PaymentForm {
	brand: string;
	last4: string;
	expMonth: string;
	expYear: string;
	isDefault: boolean;
}

export interface ReturnItemForm {
	orderItemId: string;
	reason: string;
	note: string;
	resolution: string;
}

export interface ReturnRequestForm extends ReturnItemForm {
	type: 'return' | 'exchange';
}

export interface ReturnInput {
	orderItemId: string;
	type: 'return' | 'exchange';
	reason: string;
	note: string | null;
	resolution: string | null;
}

export interface TicketForm {
	subject: string;
	category: string;
	priority: string;
	message: string;
	orderId: string;
}

export interface TicketInput {
	subject: string;
	category: string;
	priority: string;
	message: string;
	orderId: string | null;
}

export interface TimelineEntry {
	id: string;
	label: string;
	date: string | null;
}
