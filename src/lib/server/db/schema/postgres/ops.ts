import { index, jsonb, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { shopSchema } from './schema.ts';

export const auditLog = shopSchema.table(
	'audit_log',
	{
		id: text('id').primaryKey(),
		actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
		action: text('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id'),
		beforeJson: jsonb('before_json').$type<unknown>(),
		afterJson: jsonb('after_json').$type<unknown>(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull()
	},
	(table) => [
		index('audit_log_actor_idx').on(table.actorUserId),
		index('audit_log_entity_idx').on(table.entityType, table.entityId),
		index('audit_log_created_idx').on(table.createdAt)
	]
);
