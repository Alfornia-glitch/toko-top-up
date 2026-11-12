import {
	NotFoundError,
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
	toCustomerTicket,
	type AdminTicket,
	type AdminTicketDetail,
	type CustomerTicket,
	type CustomerTicketDetail,
	type MessageView,
	type SupportRepository,
	type SupportUserDirectory,
	type Ticket,
	type TicketCreateInput,
	type TicketListQuery,
	type TicketMessage,
	type TicketUpdateInput
} from '../domain/support.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface SupportService {
	/** Customer operations act on the calling actor's own tickets. */
	listMyTickets(actor: Actor | null): Outcome<CustomerTicket[]>;
	getMyTicket(id: string, actor: Actor | null): Outcome<CustomerTicketDetail>;
	createTicket(input: TicketCreateInput, actor: Actor | null): Outcome<CustomerTicketDetail>;
	addMyMessage(id: string, body: string, actor: Actor | null): Outcome<{ id: string }>;

	listTickets(
		query: TicketListQuery,
		actor: Actor | null
	): Outcome<{ data: AdminTicket[]; page: number; pageSize: number; total: number }>;
	getTicket(id: string, actor: Actor | null): Outcome<AdminTicketDetail>;
	updateTicket(
		id: string,
		input: TicketUpdateInput,
		actor: Actor | null
	): Outcome<AdminTicketDetail>;
	addAdminMessage(
		id: string,
		body: string,
		attachmentsJson: unknown[] | null | undefined,
		actor: Actor | null
	): Outcome<AdminTicketDetail>;
}

export function createSupportService(
	repository: SupportRepository,
	users: SupportUserDirectory,
	clock: Clock = systemClock
): SupportService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	async function messageViews(ticketId: string): Promise<MessageView[]> {
		const messages = await repository.listMessages(ticketId);
		const senders = await users.findUsers([...new Set(messages.map((m) => m.senderUserId))]);
		return messages.map((message) => ({
			...message,
			senderName: senders.get(message.senderUserId)?.name ?? null,
			senderEmail: senders.get(message.senderUserId)?.email ?? null
		}));
	}

	async function adminDetail(id: string): Promise<AdminTicketDetail> {
		const ticket = await repository.findTicket(id);
		if (!ticket) throw new NotFoundError('Ticket not found');
		const [customer] = await attachCustomers([ticket]);
		return { ...customer!, messages: await messageViews(id) };
	}

	async function attachCustomers(tickets: Ticket[]): Promise<AdminTicket[]> {
		const customers = await users.findUsers([...new Set(tickets.map((t) => t.userId))]);
		return tickets.map((ticket) => ({
			...ticket,
			customerName: customers.get(ticket.userId)?.name ?? null,
			customerEmail: customers.get(ticket.userId)?.email ?? null
		}));
	}

	async function ownedTicket(userId: string, id: string): Promise<Ticket> {
		const ticket = await repository.findTicket(id);
		if (!ticket || ticket.userId !== userId) throw new NotFoundError('Support ticket not found');
		return ticket;
	}

	function newMessage(
		ticketId: string,
		senderUserId: string,
		body: string,
		attachments: unknown[] | null
	): TicketMessage {
		return {
			id: newId(),
			ticketId,
			senderUserId,
			body,
			attachmentsJson: attachments,
			createdAt: clock.now()
		};
	}

	return {
		listMyTickets: (actor) =>
			run(async () => {
				const tickets = await repository.listTicketsByUser(assertActor(actor).id);
				return tickets.map(toCustomerTicket);
			}),

		getMyTicket: (id, actor) =>
			run(async () => {
				const ticket = await ownedTicket(assertActor(actor).id, id);
				return { ...toCustomerTicket(ticket), messages: await messageViews(id) };
			}),

		createTicket: (input, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const now = clock.now();
				const ticket: Ticket = {
					id: newId(),
					ticketNumber: `T-${now.getTime().toString(36).toUpperCase()}-${newId().slice(0, 4).toUpperCase()}`,
					userId,
					orderId: input.orderId ?? null,
					subject: input.subject,
					category: input.category,
					priority: input.priority ?? 'normal',
					status: 'open',
					assignedAdminId: null,
					createdAt: now,
					updatedAt: now
				};
				await repository.insertTicket(ticket, {
					...newMessage(ticket.id, userId, input.message, null),
					createdAt: now
				});
				return { ...toCustomerTicket(ticket), messages: await messageViews(ticket.id) };
			}),

		addMyMessage: (id, body, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				await ownedTicket(userId, id);
				const message = newMessage(id, userId, body, null);
				await repository.insertMessage(message);
				return { id: message.id };
			}),

		listTickets: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const emailMatchUserIds = query.q ? await users.findUserIdsByEmail(query.q) : [];
				const { data, total } = await repository.listTickets(
					{
						q: query.q,
						emailMatchUserIds,
						status: query.status,
						priority: query.priority,
						assignedAdminId: query.assignedAdminId
					},
					{ page: query.page, pageSize: query.pageSize }
				);
				return {
					data: await attachCustomers(data),
					page: query.page,
					pageSize: query.pageSize,
					total
				};
			}),

		getTicket: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				return adminDetail(id);
			}),

		updateTicket: (id, input, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				if (!(await repository.findTicket(id))) throw new NotFoundError('Ticket not found');
				await repository.updateTicket(id, {
					...(input.status ? { status: input.status } : {}),
					...(input.priority ? { priority: input.priority } : {}),
					...(input.assignedAdminId !== undefined
						? { assignedAdminId: input.assignedAdminId }
						: {}),
					updatedAt: clock.now()
				});
				return adminDetail(id);
			}),

		addAdminMessage: (id, body, attachmentsJson, actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				if (!(await repository.findTicket(id))) throw new NotFoundError('Ticket not found');
				await repository.insertMessage(newMessage(id, admin.id, body, attachmentsJson ?? null));
				return adminDetail(id);
			})
	};
}
