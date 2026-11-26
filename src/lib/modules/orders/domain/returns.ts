/** The order timeline entry a return update writes (same shape as an order event). */
export interface ReturnTimelineEvent {
	id: string;
	orderId: string;
	type: string;
	message: string | null;
	actorUserId: string | null;
	createdAt: Date;
}

export type ReturnType = 'return' | 'exchange';
export type ReturnStatus =
	'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'completed';
export type ReturnResolution = 'original_payment' | 'gift_card' | 'card';

export const RETURNS_TRANSITIONS: Record<string, string[]> = {
	requested: ['approved', 'rejected'],
	approved: ['received', 'rejected'],
	received: ['refunded', 'completed'],
	rejected: [],
	refunded: ['completed'],
	completed: []
};

export const RESOLVED_RETURN_STATUSES: readonly string[] = ['rejected', 'refunded', 'completed'];

export interface ReturnRequest {
	id: string;
	orderId: string;
	orderItemId: string;
	userId: string;
	type: ReturnType;
	reason: string;
	note: string | null;
	status: ReturnStatus;
	resolution: ReturnResolution | null;
	refundAmount: number | null;
	exchangeVariantId: string | null;
	pickupAddressJson: Record<string, unknown> | null;
	resolvedBy: string | null;
	resolvedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface ReturnImage {
	id: string;
	requestId: string;
	url: string;
}

/** A return request joined with the order and item it refers to. */
export interface ReturnRow extends ReturnRequest {
	orderNumber: string;
	productName: string;
	sku: string;
	quantity: number;
	unitPrice: number;
}

export interface ReturnCreateInput {
	orderItemId: string;
	type: ReturnType;
	reason: string;
	note?: string | null | undefined;
	resolution?: ReturnResolution | null | undefined;
}

export interface ReturnUpdateInput {
	status?: ReturnStatus | undefined;
	resolution?: ReturnResolution | null | undefined;
	refundAmount?: number | null | undefined;
	exchangeVariantId?: string | null | undefined;
	note?: string | null | undefined;
}

export interface ReturnListQuery {
	q?: string | undefined;
	status?: string | undefined;
	type?: ReturnType | undefined;
	page: number;
	pageSize: number;
}

export interface CustomerReturn {
	id: string;
	orderId: string;
	orderNumber: string;
	orderItemId: string;
	productName: string;
	sku: string;
	type: ReturnType;
	reason: string;
	status: ReturnStatus;
	resolution: ReturnResolution | null;
	refundAmount: number | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CustomerReturnDetail extends CustomerReturn {
	note: string | null;
	images: Array<{ id: string; url: string }>;
}

export interface AdminReturnListItem extends CustomerReturn {
	userId: string;
	customerEmail: string | null;
}

export interface AdminReturnDetail extends AdminReturnListItem {
	quantity: number;
	unitPrice: number;
	customerName: string | null;
	note: string | null;
	exchangeVariantId: string | null;
	pickupAddressJson: Record<string, unknown> | null;
	resolvedBy: string | null;
	resolvedAt: Date | null;
	images: ReturnImage[];
}

export interface ReturnFilter {
	q?: string | undefined;
	matchingUserIds: string[];
	status?: string | undefined;
	type?: ReturnType | undefined;
}

export interface ReturnsRepository {
	listReturns(
		filter: ReturnFilter,
		page: { page: number; pageSize: number }
	): Promise<{ data: ReturnRow[]; total: number }>;
	listReturnsForUser(userId: string): Promise<ReturnRow[]>;
	findReturn(id: string): Promise<ReturnRow | null>;
	listImages(requestId: string): Promise<ReturnImage[]>;
	/** The order an item belongs to, only when that order belongs to the user. */
	findOrderIdForItem(userId: string, orderItemId: string): Promise<string | null>;
	insertReturn(request: ReturnRequest): Promise<void>;
	/** Applies the patch and appends the order timeline event atomically. */
	updateReturn(
		id: string,
		patch: Partial<ReturnRequest>,
		event: ReturnTimelineEvent
	): Promise<void>;
}

export function toCustomerReturn(row: ReturnRow): CustomerReturn {
	return {
		id: row.id,
		orderId: row.orderId,
		orderNumber: row.orderNumber,
		orderItemId: row.orderItemId,
		productName: row.productName,
		sku: row.sku,
		type: row.type,
		reason: row.reason,
		status: row.status,
		resolution: row.resolution,
		refundAmount: row.refundAmount,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}
