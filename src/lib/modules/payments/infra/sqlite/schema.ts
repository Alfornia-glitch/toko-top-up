import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const paymentRecords = sqliteTable(
	'payments_orders',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id').notNull(),
		userId: text('user_id').notNull(),
		baseAmount: integer('base_amount').notNull(),
		uniqueCode: integer('unique_code').notNull(),
		totalAmount: integer('total_amount').notNull(),
		status: text('status', {
			enum: ['pending_payment', 'awaiting_verification', 'paid', 'rejected', 'expired']
		})
			.notNull()
			.default('pending_payment'),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('payments_orders_status_expires_idx').on(table.status, table.expiresAt),
		index('payments_orders_order_idx').on(table.orderId),
		// No two open payments may share a total, so a bank mutation maps to one order.
		uniqueIndex('payments_orders_open_total_uq')
			.on(table.totalAmount)
			.where(sql`status in ('pending_payment', 'awaiting_verification', 'rejected')`)
	]
);

export const paymentProofs = sqliteTable(
	'payments_proofs',
	{
		id: text('id').primaryKey(),
		paymentId: text('payment_id')
			.notNull()
			.references(() => paymentRecords.id, { onDelete: 'cascade' }),
		filePath: text('file_path').notNull(),
		fileHash: text('file_hash').notNull().unique(),
		uploadedAt: integer('uploaded_at', { mode: 'timestamp_ms' }).notNull(),
		reviewStatus: text('review_status', { enum: ['pending', 'approved', 'rejected'] })
			.notNull()
			.default('pending'),
		reviewedBy: text('reviewed_by'),
		reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
		rejectReason: text('reject_reason'),
		rejectNote: text('reject_note')
	},
	(table) => [index('payments_proofs_payment_idx').on(table.paymentId)]
);

export const paymentAuditLog = sqliteTable(
	'payments_audit_log',
	{
		id: text('id').primaryKey(),
		paymentId: text('payment_id')
			.notNull()
			.references(() => paymentRecords.id, { onDelete: 'cascade' }),
		actorId: text('actor_id'),
		action: text('action').notNull(),
		note: text('note'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('payments_audit_log_payment_idx').on(table.paymentId)]
);
