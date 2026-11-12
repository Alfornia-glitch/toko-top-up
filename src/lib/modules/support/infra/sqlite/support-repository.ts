import { and, asc, count, desc, eq, inArray, like, or } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import type { SupportRepository, TicketFilter } from '../../domain/support.ts';
import { supportTicketMessages, supportTickets } from './schema.ts';

function whereFor(filter: TicketFilter) {
	const conditions = [];

	if (filter.q) {
		const term = `%${filter.q}%`;
		const matches = [like(supportTickets.ticketNumber, term), like(supportTickets.subject, term)];
		if (filter.emailMatchUserIds.length) {
			matches.push(inArray(supportTickets.userId, filter.emailMatchUserIds));
		}
		conditions.push(or(...matches));
	}
	if (filter.status) conditions.push(eq(supportTickets.status, filter.status as never));
	if (filter.priority) conditions.push(eq(supportTickets.priority, filter.priority as never));
	if (filter.assignedAdminId) {
		conditions.push(eq(supportTickets.assignedAdminId, filter.assignedAdminId));
	}

	return conditions.length ? and(...conditions) : undefined;
}

export function createSqliteSupportRepository(db: SqliteDb): SupportRepository {
	return {
		async listTickets(filter, page) {
			const where = whereFor(filter);
			const data = await db
				.select()
				.from(supportTickets)
				.where(where)
				.orderBy(desc(supportTickets.updatedAt))
				.limit(page.pageSize)
				.offset((page.page - 1) * page.pageSize);
			const [row] = await db.select({ value: count() }).from(supportTickets).where(where);

			return { data, total: Number(row?.value ?? 0) };
		},

		async listTicketsByUser(userId) {
			return db
				.select()
				.from(supportTickets)
				.where(eq(supportTickets.userId, userId))
				.orderBy(desc(supportTickets.updatedAt));
		},

		async findTicket(id) {
			const [row] = await db
				.select()
				.from(supportTickets)
				.where(eq(supportTickets.id, id))
				.limit(1);
			return row ?? null;
		},

		async listMessages(ticketId) {
			return db
				.select()
				.from(supportTicketMessages)
				.where(eq(supportTicketMessages.ticketId, ticketId))
				.orderBy(asc(supportTicketMessages.createdAt));
		},

		async insertTicket(ticket, firstMessage) {
			db.transaction((tx) => {
				tx.insert(supportTickets).values(ticket).run();
				tx.insert(supportTicketMessages).values(firstMessage).run();
			});
		},

		async updateTicket(id, patch) {
			await db.update(supportTickets).set(patch).where(eq(supportTickets.id, id));
		},

		async insertMessage(message) {
			db.transaction((tx) => {
				tx.insert(supportTicketMessages).values(message).run();
				tx.update(supportTickets)
					.set({ updatedAt: message.createdAt })
					.where(eq(supportTickets.id, message.ticketId))
					.run();
			});
		}
	};
}
