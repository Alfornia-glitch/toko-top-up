export type OrderStatus =
	'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export const ORDER_TRANSITIONS: Record<string, string[]> = {
	pending: ['paid', 'cancelled'],
	paid: ['processing', 'cancelled', 'refunded'],
	processing: ['shipped', 'cancelled', 'refunded'],
	shipped: ['delivered', 'refunded'],
	delivered: ['refunded'],
	cancelled: [],
	refunded: []
};

export interface Order {
	id: string;
	orderNumber: string;
	userId: string | null;
	status: OrderStatus;
	paymentStatus: string;
	fulfillmentStatus: string;
	subtotalCents: number;
	discountCents: number;
	shippingCents: number;
	taxCents: number;
	grandTotalCents: number;
	currency: string;
	couponId: string | null;
	shippingAddressJson: Record<string, unknown> | null;
	billingAddressJson: Record<string, unknown> | null;
	trackingNumber: string | null;
	carrier: string | null;
	estimatedDeliveryAt: Date | null;
	placedAt: Date;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface OrderItem {
	id: string;
	orderId: string;
	productId: string | null;
	variantId: string | null;
	productNameSnapshot: string;
	skuSnapshot: string;
	imageUrlSnapshot: string | null;
	quantity: number;
	unitPriceCents: number;
	totalCents: number;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface OrderEvent {
	id: string;
	orderId: string;
	type: string;
	message: string | null;
	actorUserId: string | null;
	createdAt: Date;
}

export interface Shipment {
	id: string;
	orderId: string;
	carrier: string;
	trackingNumber: string;
	status: string;
	shippedAt: Date | null;
	deliveredAt: Date | null;
	eventsJson: unknown[] | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface Payment {
	id: string;
	orderId: string;
	provider: string;
	providerRef: string | null;
	amountCents: number;
	status: PaymentStatus;
	paidAt: Date | null;
	failureReason: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserSummary {
	name: string;
	email: string;
}

/** Admin list row: the order headline plus the customer's name and email. */
export interface AdminOrderListItem {
	id: string;
	orderNumber: string;
	status: OrderStatus;
	paymentStatus: string;
	fulfillmentStatus: string;
	grandTotalCents: number;
	currency: string;
	placedAt: Date;
	updatedAt: Date;
	customerName: string | null;
	customerEmail: string | null;
}

export interface AdminOrderDetail extends Order {
	customerName: string | null;
	customerEmail: string | null;
	customer: { id: string; name: string | null; email: string | null } | null;
	items: OrderItem[];
	events: OrderEvent[];
	shipments: Shipment[];
	payments: Payment[];
}

export interface CustomerOrderSummary {
	id: string;
	orderNumber: string;
	status: OrderStatus;
	paymentStatus: string;
	fulfillmentStatus: string;
	grandTotalCents: number;
	currency: string;
	placedAt: Date;
	itemCount: number;
}

export interface CustomerOrderDetail {
	id: string;
	orderNumber: string;
	status: OrderStatus;
	paymentStatus: string;
	fulfillmentStatus: string;
	subtotalCents: number;
	discountCents: number;
	shippingCents: number;
	taxCents: number;
	grandTotalCents: number;
	currency: string;
	placedAt: Date;
	shippingAddress: Record<string, unknown> | null;
	billingAddress: Record<string, unknown> | null;
	trackingNumber: string | null;
	carrier: string | null;
	estimatedDeliveryAt: Date | null;
	items: Array<{
		id: string;
		productId: string | null;
		variantId: string | null;
		productName: string;
		sku: string;
		imageUrl: string | null;
		quantity: number;
		unitPriceCents: number;
		totalCents: number;
		status: string;
	}>;
	events: Array<{ id: string; type: string; message: string | null; createdAt: Date }>;
	shipments: Array<{
		id: string;
		carrier: string;
		trackingNumber: string;
		status: string;
		shippedAt: Date | null;
		deliveredAt: Date | null;
	}>;
}

export interface OrderListQuery {
	q?: string | undefined;
	status?: string | undefined;
	paymentStatus?: string | undefined;
	fulfillmentStatus?: string | undefined;
	sort?: string | undefined;
	page: number;
	pageSize: number;
}

export interface OrderUpdateInput {
	status?: OrderStatus | undefined;
	paymentStatus?: string | undefined;
	fulfillmentStatus?: string | undefined;
	trackingNumber?: string | null | undefined;
	carrier?: string | null | undefined;
	estimatedDeliveryAt?: string | null | undefined;
	note?: string | null | undefined;
}

export interface ShipmentCreateInput {
	carrier: string;
	trackingNumber: string;
}

export interface NewOrderItem {
	productId: string | null;
	variantId: string | null;
	productNameSnapshot: string;
	skuSnapshot: string;
	imageUrlSnapshot: string | null;
	quantity: number;
	unitPriceCents: number;
	totalCents: number;
}

/** Everything checkout decides about an order; the module assigns ids, number and timestamps. */
export interface CreateOrderInput {
	/** Optional caller-chosen id, so stock movements can reference the order before it exists. */
	orderId?: string | undefined;
	userId: string;
	status: OrderStatus;
	paymentStatus: string;
	subtotalCents: number;
	discountCents: number;
	shippingCents: number;
	taxCents: number;
	grandTotalCents: number;
	currency: string;
	couponId: string | null;
	shippingAddress: Record<string, unknown>;
	billingAddress: Record<string, unknown>;
	notes: string | null;
	items: NewOrderItem[];
	payment: { provider: string; status: PaymentStatus };
}

export interface CreatedOrder {
	orderId: string;
	orderNumber: string;
}

/**
 * Read-only port over user accounts, which the orders module does not own.
 * The runtime supplies the adapter.
 */
export interface OrdersUserDirectory {
	findUsers(ids: string[]): Promise<Map<string, UserSummary>>;
	/** Ids of users whose name or email contains the term. */
	findUserIdsMatching(term: string): Promise<string[]>;
}

export interface OrderFilter {
	q?: string | undefined;
	/** Ids of users matching `q`, so searches also match the customer's name and email. */
	matchingUserIds: string[];
	status?: string | undefined;
	paymentStatus?: string | undefined;
	fulfillmentStatus?: string | undefined;
	sort?: string | undefined;
}

export interface OrderBundle {
	order: Order;
	items: OrderItem[];
	events: OrderEvent[];
	payment: Payment;
}

/** Statuses that count as revenue in reports. */
export const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered'] as const;

export interface DateRange {
	start: Date;
	end: Date;
}

export interface SalesOrderRow {
	id: string;
	status: OrderStatus;
	grandTotalCents: number;
	placedAt: Date;
}

export interface TopProductRow {
	name: string;
	sku: string;
	quantity: number;
	totalCents: number;
}

export interface SalesData {
	orders: SalesOrderRow[];
	topProducts: TopProductRow[];
}

export interface OrderTotals {
	orderCount: number;
	pendingCount: number;
	revenueCents: number;
}

export interface OrdersRepository {
	listOrders(
		filter: OrderFilter,
		page: { page: number; pageSize: number }
	): Promise<{ data: Order[]; total: number }>;
	findOrder(id: string): Promise<Order | null>;
	findOrderForUser(userId: string, numberOrId: string): Promise<Order | null>;
	listOrdersForUser(
		userId: string,
		page: { page: number; pageSize: number }
	): Promise<{ data: Order[]; total: number }>;
	countItemsByOrder(orderIds: string[]): Promise<Map<string, number>>;
	listItems(orderId: string): Promise<OrderItem[]>;
	listEvents(orderId: string): Promise<OrderEvent[]>;
	listShipments(orderId: string): Promise<Shipment[]>;
	listPayments(orderId: string): Promise<Payment[]>;

	/** Inserts the order, its items, its events and its payment atomically. */
	insertOrder(bundle: OrderBundle): Promise<void>;
	/** Applies the patch and appends the events atomically. */
	updateOrder(id: string, patch: Partial<Order>, events: OrderEvent[]): Promise<void>;
	/** Inserts the shipment, patches the order and appends the event atomically. */
	insertShipment(shipment: Shipment, orderPatch: Partial<Order>, event: OrderEvent): Promise<void>;
	listSalesOrders(range: DateRange): Promise<SalesOrderRow[]>;
	topProducts(range: DateRange, limit: number): Promise<TopProductRow[]>;
	totals(): Promise<OrderTotals>;
	/** Marks the order's payments failed (used when an order is cancelled after a failed checkout). */
	updatePayments(orderId: string, patch: Partial<Payment>): Promise<void>;
}

export function assertTransitionAllowed(from: string, to: string): boolean {
	if (from === to) return true;
	return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

export function generateOrderNumber(now: Date, random: string): string {
	return `SX-${now.getTime().toString(36).toUpperCase()}-${random.slice(0, 4).toUpperCase()}`;
}

export function toAdminListItem(
	order: Order,
	customer: UserSummary | undefined
): AdminOrderListItem {
	return {
		id: order.id,
		orderNumber: order.orderNumber,
		status: order.status,
		paymentStatus: order.paymentStatus,
		fulfillmentStatus: order.fulfillmentStatus,
		grandTotalCents: order.grandTotalCents,
		currency: order.currency,
		placedAt: order.placedAt,
		updatedAt: order.updatedAt,
		customerName: customer?.name ?? null,
		customerEmail: customer?.email ?? null
	};
}
