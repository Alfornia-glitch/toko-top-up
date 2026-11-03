import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.ts';

export const auditLog = sqliteTable(
	'audit_log',
	{
		id: text('id').primaryKey(),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		action: text('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id'),
		beforeJson: text('before_json', { mode: 'json' }).$type<unknown>(),
		afterJson: text('after_json', { mode: 'json' }).$type<unknown>(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [
		index('audit_log_actor_idx').on(table.actorUserId),
		index('audit_log_entity_idx').on(table.entityType, table.entityId),
		index('audit_log_created_idx').on(table.createdAt)
	]
);
