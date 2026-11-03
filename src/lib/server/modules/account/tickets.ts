import { and, asc, desc, eq } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import type { TicketCreateInput } from '#lib/server/modules/customer/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

const ticketSelection = {
	id: t.supportTickets.id,
	ticketNumber: t.supportTickets.ticketNumber,
	subject: t.supportTickets.subject,
	category: t.supportTickets.category,
	priority: t.supportTickets.priority,
	status: t.supportTickets.status,
	orderId: t.supportTickets.orderId,
	createdAt: t.supportTickets.createdAt,
	updatedAt: t.supportTickets.updatedAt
};

export async function listTickets(userId: string) {
	return queryDb
		.select(ticketSelection)
		.from(t.supportTickets)
		.where(eq(t.supportTickets.userId, userId))
		.orderBy(desc(t.supportTickets.updatedAt));
}

export async function getTicket(userId: string, id: string) {
	const [ticket] = await queryDb
		.select(ticketSelection)
		.from(t.supportTickets)
		.where(and(eq(t.supportTickets.id, id), eq(t.supportTickets.userId, userId)))
		.limit(1);

	if (!ticket) return null;

	const messages = await queryDb
		.select({
			id: t.supportTicketMessages.id,
			senderUserId: t.supportTicketMessages.senderUserId,
			senderName: t.user.name,
			senderEmail: t.user.email,
			body: t.supportTicketMessages.body,
			attachmentsJson: t.supportTicketMessages.attachmentsJson,
			createdAt: t.supportTicketMessages.createdAt
		})
		.from(t.supportTicketMessages)
		.innerJoin(t.user, eq(t.supportTicketMessages.senderUserId, t.user.id))
		.where(eq(t.supportTicketMessages.ticketId, id))
		.orderBy(asc(t.supportTicketMessages.createdAt));

	return { ...ticket, messages };
}

export async function createTicket(userId: string, input: TicketCreateInput) {
	const id = crypto.randomUUID();
	const now = new Date();
	const ticketNumber = `T-${Date.now().toString(36).toUpperCase()}`;

	await queryDb.transaction(async (tx: any) => {
		await tx.insert(t.supportTickets).values({
			id,
			ticketNumber,
			userId,
			orderId: input.orderId ?? null,
			subject: input.subject,
			category: input.category,
			priority: input.priority ?? 'normal',
			status: 'open',
			createdAt: now,
			updatedAt: now
		});

		await tx.insert(t.supportTicketMessages).values({
			id: crypto.randomUUID(),
			ticketId: id,
			senderUserId: userId,
			body: input.message,
			attachmentsJson: null,
			createdAt: now
		});
	});

	return getTicket(userId, id);
}

export async function addMessage(userId: string, ticketId: string, body: string) {
	const [ticket] = await queryDb
		.select({ id: t.supportTickets.id })
		.from(t.supportTickets)
		.where(and(eq(t.supportTickets.id, ticketId), eq(t.supportTickets.userId, userId)))
		.limit(1);

	if (!ticket) return null;

	const now = new Date();
	const messageId = crypto.randomUUID();

	await queryDb.insert(t.supportTicketMessages).values({
		id: messageId,
		ticketId,
		senderUserId: userId,
		body,
		attachmentsJson: null,
		createdAt: now
	});

	await queryDb
		.update(t.supportTickets)
		.set({ updatedAt: now })
		.where(eq(t.supportTickets.id, ticketId));

	return { id: messageId };
}
