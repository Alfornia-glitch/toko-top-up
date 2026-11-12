import { index, jsonb, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

export const supportTickets = shop.table(
	'support_tickets',
	{
		id: text('id').primaryKey(),
		ticketNumber: text('ticket_number').notNull().unique(),
		userId: text('user_id').notNull(),
		orderId: text('order_id'),
		subject: text('subject').notNull(),
		category: text('category').notNull(),
		priority: text('priority')
			.$type<'low' | 'normal' | 'high' | 'urgent'>()
			.notNull()
			.default('normal'),
		status: text('status')
			.$type<'open' | 'pending' | 'resolved' | 'closed'>()
			.notNull()
			.default('open'),
		assignedAdminId: text('assigned_admin_id'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('support_tickets_status_idx').on(table.status),
		index('support_tickets_assigned_idx').on(table.assignedAdminId),
		index('support_tickets_user_idx').on(table.userId)
	]
);

export const supportTicketMessages = shop.table(
	'support_ticket_messages',
	{
		id: text('id').primaryKey(),
		ticketId: text('ticket_id')
			.notNull()
			.references(() => supportTickets.id, { onDelete: 'cascade' }),
		senderUserId: text('sender_user_id').notNull(),
		body: text('body').notNull(),
		attachmentsJson: jsonb('attachments_json').$type<unknown[]>(),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [index('support_ticket_messages_ticket_idx').on(table.ticketId)]
);
