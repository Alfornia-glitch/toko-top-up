import { index, jsonb, pgSchema, text, timestamp } from 'drizzle-orm/pg-core';

const shop = pgSchema('shop');

export const auditLog = shop.table(
	'audit_log',
	{
		id: text('id').primaryKey(),
		actorUserId: text('actor_user_id'),
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
