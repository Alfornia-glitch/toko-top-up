import {
	NotFoundError,
	UnprocessableError,
	assertActor,
	assertPermission,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	assertTransitionAllowed,
	generateOrderNumber,
	toAdminListItem,
	type AdminOrderDetail,
	type AdminOrderListItem,
	type CreateOrderInput,
	type CreatedOrder,
	type DateRange,
	type CustomerOrderDetail,
	type CustomerOrderSummary,
	type Order,
	type OrderEvent,
	type OrderTotals,
	type OrderListQuery,
	type OrdersRepository,
	type OrdersUserDirectory,
	type OrderUpdateInput,
	type SalesData,
	type Shipment,
	type UserOrderTotals,
	type ShipmentCreateInput
} from '../domain/orders.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface OrdersService {
	listOrders(
		query: OrderListQuery,
		actor: Actor | null
	): Outcome<{ data: AdminOrderListItem[]; page: number; pageSize: number; total: number }>;
	getOrder(id: string, actor: Actor | null): Outcome<AdminOrderDetail>;
	updateOrder(id: string, input: OrderUpdateInput, actor: Actor | null): Outcome<AdminOrderDetail>;
	createShipment(
		id: string,
		input: ShipmentCreateInput,
		actor: Actor | null
	): Outcome<{ shipmentId: string; order: AdminOrderDetail }>;

	/** Customer operations act on the calling actor's own orders. */
	listMyOrders(
		page: { page: number; pageSize: number },
		actor: Actor | null
	): Outcome<{ data: CustomerOrderSummary[]; page: number; pageSize: number; total: number }>;
	getMyOrder(numberOrId: string, actor: Actor | null): Outcome<CustomerOrderDetail>;

	/** Reporting reads (admin): orders placed in a range, and the best-selling products among revenue orders. */
	getSalesData(range: DateRange, topLimit: number, actor: Actor | null): Outcome<SalesData>;
	getTotals(actor: Actor | null): Outcome<OrderTotals>;
	/** Order count and total spend per user, over all of their orders (admin). */
	getUserTotals(userIds: string[], actor: Actor | null): Outcome<UserOrderTotals[]>;
	/** Every order a user has placed, newest first (admin). */
	listUserOrders(userId: string, actor: Actor | null): Outcome<Order[]>;
	/** Number of orders a user has placed (admin). */
	getUserOrderCount(userId: string, actor: Actor | null): Outcome<number>;
	/** Which of these products appear on at least one order item. */
	getProductIdsWithItems(productIds: string[], actor: Actor | null): Outcome<string[]>;

	/** Service-to-service, used by checkout. Creates the order, items, placed event and payment atomically. */
	createOrder(input: CreateOrderInput): Outcome<CreatedOrder>;
	/** Service-to-service compensation: cancels an order and refunds its payment record. Idempotent. */
	cancelOrder(orderId: string, reason: string): Outcome<void>;
	/**
	 * Service-to-service fulfilment hook: a verified payment moves the order to paid.
	 * Idempotent: an order that is already paid (or further along) is left untouched.
	 */
	markPaid(orderId: string, actorUserId: string | null, note?: string): Outcome<void>;
}

export function createOrdersService(
	repository: OrdersRepository,
	users: OrdersUserDirectory,
	clock: Clock = systemClock
): OrdersService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	function event(
		orderId: string,
		type: string,
		message: string | null,
		actorUserId: string | null,
		now: Date
	): OrderEvent {
		return { id: newId(), orderId, type, message, actorUserId, createdAt: now };
	}

	async function adminDetail(order: Order): Promise<AdminOrderDetail> {
		const [items, events, shipments, payments, customers] = await Promise.all([
			repository.listItems(order.id),
			repository.listEvents(order.id),
			repository.listShipments(order.id),
			repository.listPayments(order.id),
			order.userId ? users.findUsers([order.userId]) : Promise.resolve(new Map())
		]);
		const customer = order.userId ? customers.get(order.userId) : undefined;

		return {
			...order,
			customerName: customer?.name ?? null,
			customerEmail: customer?.email ?? null,
			customer: order.userId
				? { id: order.userId, name: customer?.name ?? null, email: customer?.email ?? null }
				: null,
			items,
			events,
			shipments,
			payments
		};
	}

	async function requireOrder(id: string): Promise<Order> {
		const order = await repository.findOrder(id);
		if (!order) throw new NotFoundError('Order not found');
		return order;
	}

	return {
		listOrders: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const matchingUserIds = query.q ? await users.findUserIdsMatching(query.q) : [];
				const { data, total } = await repository.listOrders(
					{
						q: query.q,
						matchingUserIds,
						status: query.status,
						paymentStatus: query.paymentStatus,
						fulfillmentStatus: query.fulfillmentStatus,
						sort: query.sort
					},
					{ page: query.page, pageSize: query.pageSize }
				);
				const customers = await users.findUsers([
					...new Set(data.flatMap((order) => (order.userId ? [order.userId] : [])))
				]);
				return {
					data: data.map((order) =>
						toAdminListItem(order, order.userId ? customers.get(order.userId) : undefined)
					),
					page: query.page,
					pageSize: query.pageSize,
					total
				};
			}),

		getOrder: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return adminDetail(await requireOrder(id));
			}),

		updateOrder: (id, input, actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				const existing = await requireOrder(id);

				const nextStatus = input.status ?? existing.status;
				if (!assertTransitionAllowed(existing.status, nextStatus)) {
					throw new UnprocessableError(
						`Cannot move an order from "${existing.status}" to "${nextStatus}"`
					);
				}

				const now = clock.now();
				const patch: Partial<Order> = { updatedAt: now };
				if (input.status) patch.status = input.status;
				if (input.paymentStatus) patch.paymentStatus = input.paymentStatus;
				if (input.fulfillmentStatus) patch.fulfillmentStatus = input.fulfillmentStatus;
				if (input.trackingNumber !== undefined) patch.trackingNumber = input.trackingNumber;
				if (input.carrier !== undefined) patch.carrier = input.carrier;
				if (input.estimatedDeliveryAt !== undefined) {
					patch.estimatedDeliveryAt = input.estimatedDeliveryAt
						? new Date(input.estimatedDeliveryAt)
						: null;
				}
				if (input.status === 'paid' && !input.paymentStatus) patch.paymentStatus = 'paid';
				if (input.status === 'refunded' && !input.paymentStatus) patch.paymentStatus = 'refunded';

				const events: OrderEvent[] = [];
				if (input.status && input.status !== existing.status) {
					events.push(
						event(
							id,
							'status_change',
							`Status changed from ${existing.status} to ${input.status}`,
							admin.id,
							now
						)
					);
				}
				if (input.note) events.push(event(id, 'note', input.note, admin.id, now));

				await repository.updateOrder(id, patch, events);
				return adminDetail(await requireOrder(id));
			}),

		createShipment: (id, input, actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				const existing = await requireOrder(id);

				if (['pending', 'cancelled', 'refunded'].includes(existing.status)) {
					throw new UnprocessableError(`Cannot ship an order with status "${existing.status}"`);
				}

				const now = clock.now();
				const shipment: Shipment = {
					id: newId(),
					orderId: id,
					carrier: input.carrier,
					trackingNumber: input.trackingNumber,
					status: 'shipped',
					shippedAt: now,
					deliveredAt: null,
					eventsJson: [],
					createdAt: now,
					updatedAt: now
				};

				await repository.insertShipment(
					shipment,
					{
						status: existing.status === 'delivered' ? 'delivered' : 'shipped',
						fulfillmentStatus: 'fulfilled',
						carrier: input.carrier,
						trackingNumber: input.trackingNumber,
						updatedAt: now
					},
					event(
						id,
						'shipment',
						`Shipped with ${input.carrier} (${input.trackingNumber})`,
						admin.id,
						now
					)
				);

				return { shipmentId: shipment.id, order: await adminDetail(await requireOrder(id)) };
			}),

		listMyOrders: (page, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const { data, total } = await repository.listOrdersForUser(userId, page);
				const counts = await repository.countItemsByOrder(data.map((order) => order.id));
				return {
					data: data.map((order) => ({
						id: order.id,
						orderNumber: order.orderNumber,
						status: order.status,
						paymentStatus: order.paymentStatus,
						fulfillmentStatus: order.fulfillmentStatus,
						grandTotalCents: order.grandTotalCents,
						currency: order.currency,
						placedAt: order.placedAt,
						itemCount: counts.get(order.id) ?? 0
					})),
					page: page.page,
					pageSize: page.pageSize,
					total
				};
			}),

		getMyOrder: (numberOrId, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const order = await repository.findOrderForUser(userId, numberOrId);
				if (!order) throw new NotFoundError('Order not found');

				const [items, events, shipments] = await Promise.all([
					repository.listItems(order.id),
					repository.listEvents(order.id),
					repository.listShipments(order.id)
				]);

				return {
					id: order.id,
					orderNumber: order.orderNumber,
					status: order.status,
					paymentStatus: order.paymentStatus,
					fulfillmentStatus: order.fulfillmentStatus,
					subtotalCents: order.subtotalCents,
					discountCents: order.discountCents,
					shippingCents: order.shippingCents,
					taxCents: order.taxCents,
					grandTotalCents: order.grandTotalCents,
					currency: order.currency,
					placedAt: order.placedAt,
					shippingAddress: order.shippingAddressJson ?? null,
					billingAddress: order.billingAddressJson ?? null,
					trackingNumber: order.trackingNumber ?? null,
					carrier: order.carrier ?? null,
					estimatedDeliveryAt: order.estimatedDeliveryAt ?? null,
					items: items.map((item) => ({
						id: item.id,
						productId: item.productId,
						variantId: item.variantId,
						productName: item.productNameSnapshot,
						sku: item.skuSnapshot,
						imageUrl: item.imageUrlSnapshot,
						quantity: item.quantity,
						unitPriceCents: item.unitPriceCents,
						totalCents: item.totalCents,
						status: item.status
					})),
					events: events.map((entry) => ({
						id: entry.id,
						type: entry.type,
						message: entry.message,
						createdAt: entry.createdAt
					})),
					shipments: shipments.map((shipment) => ({
						id: shipment.id,
						carrier: shipment.carrier,
						trackingNumber: shipment.trackingNumber,
						status: shipment.status,
						shippedAt: shipment.shippedAt,
						deliveredAt: shipment.deliveredAt
					}))
				};
			}),

		getSalesData: (range, topLimit, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const [salesOrders, topProducts] = await Promise.all([
					repository.listSalesOrders(range),
					repository.topProducts(range, topLimit)
				]);
				return { orders: salesOrders, topProducts };
			}),

		getUserTotals: (userIds, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				if (!userIds.length) return [];
				return repository.totalsForUsers(userIds);
			}),

		listUserOrders: (userId, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return repository.listAllForUser(userId);
			}),

		getUserOrderCount: (userId, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return repository.countForUser(userId);
			}),

		getProductIdsWithItems: (productIds, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				if (!productIds.length) return [];
				return repository.productIdsWithItems(productIds);
			}),

		getTotals: (actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return repository.totals();
			}),

		createOrder: (input) =>
			run(async () => {
				const now = clock.now();
				const orderId = input.orderId ?? newId();
				const orderNumber = generateOrderNumber(now, newId());

				await repository.insertOrder({
					order: {
						id: orderId,
						orderNumber,
						userId: input.userId,
						status: input.status,
						paymentStatus: input.paymentStatus,
						fulfillmentStatus: 'unfulfilled',
						subtotalCents: input.subtotalCents,
						discountCents: input.discountCents,
						shippingCents: input.shippingCents,
						taxCents: input.taxCents,
						grandTotalCents: input.grandTotalCents,
						currency: input.currency,
						couponId: input.couponId,
						shippingAddressJson: input.shippingAddress,
						billingAddressJson: input.billingAddress,
						trackingNumber: null,
						carrier: null,
						estimatedDeliveryAt: null,
						placedAt: now,
						notes: input.notes,
						createdAt: now,
						updatedAt: now
					},
					items: input.items.map((item) => ({
						id: newId(),
						orderId,
						...item,
						status: 'pending',
						createdAt: now,
						updatedAt: now
					})),
					events: [event(orderId, 'placed', 'Order placed', input.userId, now)],
					payment: {
						id: newId(),
						orderId,
						provider: input.payment.provider,
						providerRef: null,
						amountCents: input.grandTotalCents,
						status: input.payment.status,
						paidAt: input.payment.status === 'succeeded' ? now : null,
						failureReason: null,
						createdAt: now,
						updatedAt: now
					}
				});

				return { orderId, orderNumber };
			}),

		markPaid: (orderId, actorUserId, note) =>
			run(async () => {
				const order = await requireOrder(orderId);
				if (order.status !== 'pending') {
					if (order.status === 'cancelled') {
						throw new UnprocessableError('Cannot mark a cancelled order as paid');
					}
					return;
				}

				const now = clock.now();
				await repository.updateOrder(
					orderId,
					{ status: 'paid', paymentStatus: 'paid', updatedAt: now },
					[event(orderId, 'payment_verified', note ?? 'Payment verified', actorUserId, now)]
				);
				await repository.updatePayments(orderId, {
					status: 'succeeded',
					paidAt: now,
					updatedAt: now
				});
			}),

		cancelOrder: (orderId, reason) =>
			run(async () => {
				const order = await requireOrder(orderId);
				if (order.status === 'cancelled') return;

				const now = clock.now();
				await repository.updateOrder(
					orderId,
					{ status: 'cancelled', paymentStatus: 'refunded', updatedAt: now },
					[event(orderId, 'status_change', `Order cancelled: ${reason}`, null, now)]
				);
				await repository.updatePayments(orderId, {
					status: 'refunded',
					failureReason: reason,
					updatedAt: now
				});
			})
	};
}
