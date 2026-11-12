import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth.ts';
import { productVariants } from '#modules/catalog/infra/pg/schema.ts';
import { orderItems, orders } from '#modules/orders/infra/pg/schema.ts';
import { shopSchema } from './schema.ts';

const timestamps = {
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
		.$onUpdate(() => new Date())
		.notNull()
};

export const returnRequests = shopSchema.table(
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
		type: text('type').$type<'return' | 'exchange'>().notNull(),
		reason: text('reason').notNull(),
		note: text('note'),
		status: text('status')
			.$type<'requested' | 'approved' | 'rejected' | 'received' | 'refunded' | 'completed'>()
			.notNull()
			.default('requested'),
		resolution: text('resolution').$type<'original_payment' | 'gift_card' | 'card'>(),
		refundAmountCents: integer('refund_amount_cents'),
		exchangeVariantId: text('exchange_variant_id').references(() => productVariants.id, {
			onDelete: 'set null'
		}),
		pickupAddressJson: jsonb('pickup_address_json').$type<Record<string, unknown>>(),
		resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
		resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
		...timestamps
	},
	(table) => [
		index('return_requests_status_idx').on(table.status),
		index('return_requests_order_idx').on(table.orderId)
	]
);

export const returnRequestImages = shopSchema.table(
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
