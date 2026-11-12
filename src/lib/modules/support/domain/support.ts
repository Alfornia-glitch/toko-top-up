export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed';

export interface Ticket {
	id: string;
	ticketNumber: string;
	userId: string;
	orderId: string | null;
	subject: string;
	category: string;
	priority: TicketPriority;
	status: TicketStatus;
	assignedAdminId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface TicketMessage {
	id: string;
	ticketId: string;
	senderUserId: string;
	body: string;
	attachmentsJson: unknown[] | null;
	createdAt: Date;
}

export interface UserSummary {
	name: string;
	email: string;
}

export interface TicketCreateInput {
	subject: string;
	category: string;
	priority?: TicketPriority | undefined;
	orderId?: string | null | undefined;
	message: string;
}

export interface TicketUpdateInput {
	status?: TicketStatus | undefined;
	priority?: TicketPriority | undefined;
	assignedAdminId?: string | null | undefined;
}

export interface TicketListQuery {
	q?: string | undefined;
	status?: string | undefined;
	priority?: string | undefined;
	assignedAdminId?: string | undefined;
	page: number;
	pageSize: number;
}

export type MessageView = TicketMessage & { senderName: string | null; senderEmail: string | null };

/** Admin view: the ticket plus the customer's name and email. */
export type AdminTicket = Ticket & { customerName: string | null; customerEmail: string | null };
export type AdminTicketDetail = AdminTicket & { messages: MessageView[] };

/** Customer view: internal fields such as the assignee are not exposed. */
export type CustomerTicket = Pick<
	Ticket,
	| 'id'
	| 'ticketNumber'
	| 'subject'
	| 'category'
	| 'priority'
	| 'status'
	| 'orderId'
	| 'createdAt'
	| 'updatedAt'
>;
export type CustomerTicketDetail = CustomerTicket & { messages: MessageView[] };

/**
 * Read-only port over user accounts, which the support module does not own.
 * The runtime supplies the adapter.
 */
export interface SupportUserDirectory {
	findUsers(ids: string[]): Promise<Map<string, UserSummary>>;
	findUserIdsByEmail(term: string): Promise<string[]>;
}

export interface TicketFilter {
	q?: string | undefined;
	/** Ids of users whose email matches `q`, so searches also match the customer's email. */
	emailMatchUserIds: string[];
	status?: string | undefined;
	priority?: string | undefined;
	assignedAdminId?: string | undefined;
}

export interface SupportRepository {
	listTickets(
		filter: TicketFilter,
		page: { page: number; pageSize: number }
	): Promise<{ data: Ticket[]; total: number }>;
	listTicketsByUser(userId: string): Promise<Ticket[]>;
	findTicket(id: string): Promise<Ticket | null>;
	listMessages(ticketId: string): Promise<TicketMessage[]>;
	/** Inserts the ticket and its first message atomically. */
	insertTicket(ticket: Ticket, firstMessage: TicketMessage): Promise<void>;
	updateTicket(id: string, patch: Partial<Ticket>): Promise<void>;
	/** Inserts the message and bumps the ticket's `updatedAt`. */
	insertMessage(message: TicketMessage): Promise<void>;
}

export function toCustomerTicket(ticket: Ticket): CustomerTicket {
	return {
		id: ticket.id,
		ticketNumber: ticket.ticketNumber,
		subject: ticket.subject,
		category: ticket.category,
		priority: ticket.priority,
		status: ticket.status,
		orderId: ticket.orderId,
		createdAt: ticket.createdAt,
		updatedAt: ticket.updatedAt
	};
}
