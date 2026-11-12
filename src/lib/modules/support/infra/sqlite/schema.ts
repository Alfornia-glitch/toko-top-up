import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const supportTickets = sqliteTable(
	'support_tickets',
	{
		id: text('id').primaryKey(),
		ticketNumber: text('ticket_number').notNull().unique(),
		userId: text('user_id').notNull(),
		orderId: text('order_id'),
		subject: text('subject').notNull(),
		category: text('category').notNull(),
		priority: text('priority', { enum: ['low', 'normal', 'high', 'urgent'] })
			.notNull()
			.default('normal'),
		status: text('status', { enum: ['open', 'pending', 'resolved', 'closed'] })
			.notNull()
			.default('open'),
		assignedAdminId: text('assigned_admin_id'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('support_tickets_status_idx').on(table.status),
		index('support_tickets_assigned_idx').on(table.assignedAdminId),
		index('support_tickets_user_idx').on(table.userId)
	]
);

export const supportTicketMessages = sqliteTable(
	'support_ticket_messages',
	{
		id: text('id').primaryKey(),
		ticketId: text('ticket_id')
			.notNull()
			.references(() => supportTickets.id, { onDelete: 'cascade' }),
		senderUserId: text('sender_user_id').notNull(),
		body: text('body').notNull(),
		attachmentsJson: text('attachments_json', { mode: 'json' }).$type<unknown[]>(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('support_ticket_messages_ticket_idx').on(table.ticketId)]
);
