import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth.ts';
import { productVariants } from '#modules/catalog/infra/sqlite/schema.ts';
import { orderItems, orders } from '#modules/orders/infra/sqlite/schema.ts';

const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const returnRequests = sqliteTable(
	'return_requests',
	{
		id: text('id').primaryKey(),
		orderId: text('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		orderItemId: text('order_item_id')
			.notNull()
			.references(() => orderItems.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['return', 'exchange'] }).notNull(),
		reason: text('reason').notNull(),
		note: text('note'),
		status: text('status', {
			enum: ['requested', 'approved', 'rejected', 'received', 'refunded', 'completed']
		})
			.notNull()
			.default('requested'),
		resolution: text('resolution', { enum: ['original_payment', 'gift_card', 'card'] }),
		refundAmountCents: integer('refund_amount_cents'),
		exchangeVariantId: text('exchange_variant_id').references(() => productVariants.id, {
			onDelete: 'set null'
		}),
		pickupAddressJson: text('pickup_address_json', { mode: 'json' }).$type<
			Record<string, unknown>
		>(),
		resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
		resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
		...timestamps
	},
	(table) => [
		index('return_requests_status_idx').on(table.status),
		index('return_requests_order_idx').on(table.orderId)
	]
);

export const returnRequestImages = sqliteTable(
	'return_request_images',
	{
		id: text('id').primaryKey(),
		requestId: text('request_id')
			.notNull()
			.references(() => returnRequests.id, { onDelete: 'cascade' }),
		url: text('url').notNull()
	},
	(table) => [index('return_request_images_request_idx').on(table.requestId)]
);

export const returnRequestsRelations = relations(returnRequests, ({ one, many }) => ({
	order: one(orders, { fields: [returnRequests.orderId], references: [orders.id] }),
	orderItem: one(orderItems, {
		fields: [returnRequests.orderItemId],
		references: [orderItems.id]
	}),
	user: one(user, { fields: [returnRequests.userId], references: [user.id] }),
	images: many(returnRequestImages)
}));

export const returnRequestImagesRelations = relations(returnRequestImages, ({ one }) => ({
	request: one(returnRequests, {
		fields: [returnRequestImages.requestId],
		references: [returnRequests.id]
	})
}));
