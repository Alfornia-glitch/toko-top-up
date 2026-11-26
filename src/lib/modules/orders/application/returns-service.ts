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
import type { OrdersUserDirectory } from '../domain/orders.ts';
import {
	RESOLVED_RETURN_STATUSES,
	RETURNS_TRANSITIONS,
	toCustomerReturn,
	type AdminReturnDetail,
	type AdminReturnListItem,
	type CustomerReturn,
	type CustomerReturnDetail,
	type ReturnCreateInput,
	type ReturnListQuery,
	type ReturnRequest,
	type ReturnRow,
	type ReturnsRepository,
	type ReturnUpdateInput
} from '../domain/returns.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface ReturnsService {
	/** Customer operations act on the calling actor's own return requests. */
	listMyReturns(actor: Actor | null): Outcome<CustomerReturn[]>;
	getMyReturn(id: string, actor: Actor | null): Outcome<CustomerReturnDetail>;
	createReturn(input: ReturnCreateInput, actor: Actor | null): Outcome<CustomerReturnDetail>;

	listReturns(
		query: ReturnListQuery,
		actor: Actor | null
	): Outcome<{ data: AdminReturnListItem[]; page: number; pageSize: number; total: number }>;
	getReturn(id: string, actor: Actor | null): Outcome<AdminReturnDetail>;
	updateReturn(
		id: string,
		input: ReturnUpdateInput,
		actor: Actor | null
	): Outcome<AdminReturnDetail>;
}

export function createReturnsService(
	repository: ReturnsRepository,
	users: OrdersUserDirectory,
	clock: Clock = systemClock
): ReturnsService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	async function requireRow(id: string): Promise<ReturnRow> {
		const row = await repository.findReturn(id);
		if (!row) throw new NotFoundError('Return not found', { messageKey: 'return_not_found' });
		return row;
	}

	async function customerDetail(row: ReturnRow): Promise<CustomerReturnDetail> {
		const images = await repository.listImages(row.id);
		return {
			...toCustomerReturn(row),
			note: row.note,
			images: images.map((image) => ({ id: image.id, url: image.url }))
		};
	}

	async function adminDetail(row: ReturnRow): Promise<AdminReturnDetail> {
		const [images, customers] = await Promise.all([
			repository.listImages(row.id),
			users.findUsers([row.userId])
		]);
		const customer = customers.get(row.userId);
		return {
			...toCustomerReturn(row),
			userId: row.userId,
			customerEmail: customer?.email ?? null,
			customerName: customer?.name ?? null,
			quantity: row.quantity,
			unitPrice: row.unitPrice,
			note: row.note,
			exchangeVariantId: row.exchangeVariantId,
			pickupAddressJson: row.pickupAddressJson,
			resolvedBy: row.resolvedBy,
			resolvedAt: row.resolvedAt,
			images
		};
	}

	return {
		listMyReturns: (actor) =>
			run(async () => {
				const rows = await repository.listReturnsForUser(assertActor(actor).id);
				return rows.map(toCustomerReturn);
			}),

		getMyReturn: (id, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const row = await repository.findReturn(id);
				if (!row || row.userId !== userId)
					throw new NotFoundError('Return not found', { messageKey: 'return_not_found' });
				return customerDetail(row);
			}),

		createReturn: (input, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const orderId = await repository.findOrderIdForItem(userId, input.orderItemId);
				if (!orderId)
					throw new NotFoundError('Order item not found', { messageKey: 'order_item_not_found' });

				const now = clock.now();
				const request: ReturnRequest = {
					id: newId(),
					orderId,
					orderItemId: input.orderItemId,
					userId,
					type: input.type,
					reason: input.reason,
					note: input.note ?? null,
					status: 'requested',
					resolution: input.resolution ?? null,
					refundAmount: null,
					exchangeVariantId: null,
					pickupAddressJson: null,
					resolvedBy: null,
					resolvedAt: null,
					createdAt: now,
					updatedAt: now
				};
				await repository.insertReturn(request);
				return customerDetail(await requireRow(request.id));
			}),

		listReturns: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const matchingUserIds = query.q ? await users.findUserIdsMatching(query.q) : [];
				const { data, total } = await repository.listReturns(
					{ q: query.q, matchingUserIds, status: query.status, type: query.type },
					{ page: query.page, pageSize: query.pageSize }
				);
				const customers = await users.findUsers([...new Set(data.map((row) => row.userId))]);
				return {
					data: data.map((row) => ({
						...toCustomerReturn(row),
						userId: row.userId,
						customerEmail: customers.get(row.userId)?.email ?? null
					})),
					page: query.page,
					pageSize: query.pageSize,
					total
				};
			}),

		getReturn: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return adminDetail(await requireRow(id));
			}),

		updateReturn: (id, input, actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				const existing = await requireRow(id);

				if (input.status && input.status !== existing.status) {
					const allowed = RETURNS_TRANSITIONS[existing.status] ?? [];
					if (!allowed.includes(input.status)) {
						throw new UnprocessableError(
							`Cannot move a return from "${existing.status}" to "${input.status}"`,
							{
								messageKey: 'return_transition_invalid',
								params: { from: existing.status, to: input.status }
							}
						);
					}
				}

				const nextStatus = input.status ?? existing.status;
				const now = clock.now();
				const resolved = RESOLVED_RETURN_STATUSES.includes(nextStatus);

				await repository.updateReturn(
					id,
					{
						...(input.status ? { status: input.status } : {}),
						...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
						...(input.refundAmount !== undefined ? { refundAmount: input.refundAmount } : {}),
						...(input.exchangeVariantId !== undefined
							? { exchangeVariantId: input.exchangeVariantId }
							: {}),
						...(input.note !== undefined ? { note: input.note } : {}),
						...(resolved ? { resolvedBy: admin.id, resolvedAt: now } : {}),
						updatedAt: now
					},
					{
						id: newId(),
						orderId: existing.orderId,
						type: 'return_update',
						message: input.status
							? `Return ${existing.id} moved from ${existing.status} to ${input.status}`
							: `Return ${existing.id} updated`,
						actorUserId: admin.id,
						createdAt: now
					}
				);

				return adminDetail(await requireRow(id));
			})
	};
}
