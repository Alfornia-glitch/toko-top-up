import { and, asc, count, desc, eq, like, or } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import type { SupportListQuery, SupportUpdateInput } from '#lib/server/modules/admin/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

export async function listTickets(query: SupportListQuery) {
	const conditions = [];
	if (query.q) {
		const term = `%${query.q}%`;
		conditions.push(
			or(
				like(t.supportTickets.ticketNumber, term),
				like(t.supportTickets.subject, term),
				like(t.user.email, term)
			)
		);
	}
	if (query.status) conditions.push(eq(t.supportTickets.status, query.status));
	if (query.priority) conditions.push(eq(t.supportTickets.priority, query.priority));
	if (query.assignedAdminId)
		conditions.push(eq(t.supportTickets.assignedAdminId, query.assignedAdminId));

	const where = conditions.length ? and(...conditions) : undefined;
	const offset = (query.page - 1) * query.pageSize;

	const data = await queryDb
		.select({
			id: t.supportTickets.id,
			ticketNumber: t.supportTickets.ticketNumber,
			subject: t.supportTickets.subject,
			category: t.supportTickets.category,
			priority: t.supportTickets.priority,
			status: t.supportTickets.status,
			userId: t.supportTickets.userId,
			customerName: t.user.name,
			customerEmail: t.user.email,
			orderId: t.supportTickets.orderId,
			assignedAdminId: t.supportTickets.assignedAdminId,
			createdAt: t.supportTickets.createdAt,
			updatedAt: t.supportTickets.updatedAt
		})
		.from(t.supportTickets)
		.leftJoin(t.user, eq(t.supportTickets.userId, t.user.id))
		.where(where)
		.orderBy(desc(t.supportTickets.updatedAt))
		.limit(query.pageSize)
		.offset(offset);

	const [{ value: total }] = await queryDb
		.select({ value: count() })
		.from(t.supportTickets)
		.leftJoin(t.user, eq(t.supportTickets.userId, t.user.id))
		.where(where);

	return { data, page: query.page, pageSize: query.pageSize, total: Number(total ?? 0) };
}

export async function getTicket(id: string) {
	const [ticket] = await queryDb
		.select({
			id: t.supportTickets.id,
			ticketNumber: t.supportTickets.ticketNumber,
			subject: t.supportTickets.subject,
			category: t.supportTickets.category,
			priority: t.supportTickets.priority,
			status: t.supportTickets.status,
			userId: t.supportTickets.userId,
			customerName: t.user.name,
			customerEmail: t.user.email,
			orderId: t.supportTickets.orderId,
			assignedAdminId: t.supportTickets.assignedAdminId,
			createdAt: t.supportTickets.createdAt,
			updatedAt: t.supportTickets.updatedAt
		})
		.from(t.supportTickets)
		.leftJoin(t.user, eq(t.supportTickets.userId, t.user.id))
		.where(eq(t.supportTickets.id, id))
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
		.leftJoin(t.user, eq(t.supportTicketMessages.senderUserId, t.user.id))
		.where(eq(t.supportTicketMessages.ticketId, id))
		.orderBy(asc(t.supportTicketMessages.createdAt));

	return { ...ticket, messages };
}

export async function updateTicket(id: string, input: SupportUpdateInput) {
	const existing = await getTicket(id);
	if (!existing) return null;

	await queryDb
		.update(t.supportTickets)
		.set({
			...(input.status ? { status: input.status } : {}),
			...(input.priority ? { priority: input.priority } : {}),
			...(input.assignedAdminId !== undefined ? { assignedAdminId: input.assignedAdminId } : {}),
			updatedAt: new Date()
		})
		.where(eq(t.supportTickets.id, id));

	return getTicket(id);
}

export async function addTicketMessage(
	id: string,
	senderUserId: string,
	body: string,
	attachmentsJson?: unknown[] | null
) {
	const [ticket] = await queryDb
		.select({ id: t.supportTickets.id })
		.from(t.supportTickets)
		.where(eq(t.supportTickets.id, id))
		.limit(1);
	if (!ticket) return null;

	const now = new Date();
	const messageId = crypto.randomUUID();

	await queryDb.insert(t.supportTicketMessages).values({
		id: messageId,
		ticketId: id,
		senderUserId,
		body,
		attachmentsJson: attachmentsJson ?? null,
		createdAt: now
	});

	await queryDb.update(t.supportTickets).set({ updatedAt: now }).where(eq(t.supportTickets.id, id));

	return { id: messageId };
}
