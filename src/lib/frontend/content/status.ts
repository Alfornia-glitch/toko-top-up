export const ORDER_STATUS_LABELS: Record<string, string> = {
	pending: 'Pending',
	paid: 'Paid',
	processing: 'Processing',
	shipped: 'Shipped',
	delivered: 'Delivered',
	cancelled: 'Cancelled',
	refunded: 'Refunded'
};

export const RETURN_STATUS_LABELS: Record<string, string> = {
	pending: 'Pending',
	approved: 'Approved',
	rejected: 'Rejected',
	in_transit: 'In Transit',
	received: 'Received',
	completed: 'Completed',
	cancelled: 'Cancelled',
	refunded: 'Refunded'
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
	open: 'Open',
	pending: 'Pending',
	in_progress: 'In Progress',
	resolved: 'Resolved',
	closed: 'Closed'
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
	pending: 'Pending',
	authorized: 'Authorized',
	paid: 'Paid',
	failed: 'Failed',
	cancelled: 'Cancelled',
	refunded: 'Refunded',
	partially_refunded: 'Partially Refunded'
};

export function statusLabel(map: Record<string, string>, value: string): string {
	return map[value] ?? value;
}
