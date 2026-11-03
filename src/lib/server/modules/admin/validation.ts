import { z } from 'zod';

export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(25),
	q: z.string().trim().max(200).optional(),
	status: z.string().trim().max(40).optional(),
	sort: z.string().trim().max(40).optional()
});

export const mediaListSchema = paginationSchema.extend({
	folder: z.string().trim().max(40).optional()
});

const statusFilter = z.enum(['active', 'inactive']);

export const productListSchema = paginationSchema.extend({
	categoryId: z.string().trim().max(100).optional(),
	brandId: z.string().trim().max(100).optional()
});

export const productImageSchema = z.object({
	id: z.string().trim().max(100).optional(),
	url: z.string().trim().min(1).max(2000),
	path: z.string().trim().max(500).nullable().optional(),
	alt: z.string().trim().max(250).nullable().optional(),
	position: z.number().int().min(0).default(0)
});

export const productOptionValueSchema = z.object({
	id: z.string().trim().max(100).optional(),
	value: z.string().trim().min(1).max(100),
	colorHex: z.string().trim().max(20).nullable().optional(),
	position: z.number().int().min(0).default(0)
});

export const productOptionSchema = z.object({
	id: z.string().trim().max(100).optional(),
	name: z.string().trim().min(1).max(100),
	position: z.number().int().min(0).default(0),
	values: z.array(productOptionValueSchema).max(100).default([])
});

export const productVariantSchema = z.object({
	id: z.string().trim().max(100).optional(),
	sku: z.string().trim().min(1).max(100),
	name: z.string().trim().min(1).max(200),
	priceCents: z.number().int().min(0),
	compareAtPriceCents: z.number().int().min(0).nullable().optional(),
	stock: z.number().int().min(0).default(0),
	weightGrams: z.number().int().min(0).nullable().optional(),
	status: statusFilter.default('active'),
	optionValuesJson: z.record(z.string(), z.string()).nullable().optional()
});

export const productWriteSchema = z.object({
	sku: z.string().trim().min(1).max(100),
	name: z.string().trim().min(1).max(250),
	slug: z.string().trim().min(1).max(250).optional(),
	description: z.string().trim().max(20000).nullable().optional(),
	shortDescription: z.string().trim().max(1000).nullable().optional(),
	brandId: z.string().trim().max(100).nullable().optional(),
	categoryId: z.string().trim().max(100).nullable().optional(),
	status: z.enum(['draft', 'active', 'archived']).default('draft'),
	priceCents: z.number().int().min(0),
	compareAtPriceCents: z.number().int().min(0).nullable().optional(),
	currency: z.string().trim().length(3).default('USD'),
	isFeatured: z.boolean().default(false),
	isNewArrival: z.boolean().default(false),
	isDeal: z.boolean().default(false),
	dealEndsAt: z.string().datetime().nullable().optional(),
	specsJson: z.record(z.string(), z.unknown()).nullable().optional(),
	shippingInfo: z.string().trim().max(5000).nullable().optional(),
	returnPolicy: z.string().trim().max(5000).nullable().optional(),
	images: z.array(productImageSchema).max(30).default([]),
	options: z.array(productOptionSchema).max(20).default([]),
	variants: z.array(productVariantSchema).max(500).default([])
});

export const categoryWriteSchema = z.object({
	name: z.string().trim().min(1).max(200),
	slug: z.string().trim().min(1).max(200).optional(),
	parentId: z.string().trim().max(100).nullable().optional(),
	description: z.string().trim().max(5000).nullable().optional(),
	imageUrl: z.string().trim().max(2000).nullable().optional(),
	position: z.number().int().min(0).default(0),
	status: statusFilter.default('active')
});

export const brandWriteSchema = z.object({
	name: z.string().trim().min(1).max(200),
	slug: z.string().trim().min(1).max(200).optional(),
	logoUrl: z.string().trim().max(2000).nullable().optional(),
	description: z.string().trim().max(5000).nullable().optional(),
	status: statusFilter.default('active')
});

export const inventoryListSchema = paginationSchema.extend({
	variantId: z.string().trim().max(100).optional(),
	lowStock: z
		.enum(['true', 'false'])
		.optional()
		.transform((value) => value === 'true')
});

export const stockAdjustSchema = z.object({
	variantId: z.string().trim().min(1).max(100),
	delta: z
		.number()
		.int()
		.refine((value) => value !== 0, 'Delta must not be zero'),
	reason: z.string().trim().min(1).max(250),
	referenceType: z.string().trim().max(100).nullable().optional(),
	referenceId: z.string().trim().max(100).nullable().optional()
});

export const movementListSchema = paginationSchema.extend({
	variantId: z.string().trim().max(100).optional()
});

export type MediaListQuery = z.infer<typeof mediaListSchema>;
export type ProductListQuery = z.infer<typeof productListSchema>;
export type ProductWriteInput = z.infer<typeof productWriteSchema>;
export type CategoryWriteInput = z.infer<typeof categoryWriteSchema>;
export type BrandWriteInput = z.infer<typeof brandWriteSchema>;
export type InventoryListQuery = z.infer<typeof inventoryListSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
export type MovementListQuery = z.infer<typeof movementListSchema>;

export const orderListSchema = paginationSchema.extend({
	paymentStatus: z.string().trim().max(40).optional(),
	fulfillmentStatus: z.string().trim().max(40).optional()
});

const orderStatus = z.enum([
	'pending',
	'paid',
	'processing',
	'shipped',
	'delivered',
	'cancelled',
	'refunded'
]);

export const orderUpdateSchema = z.object({
	status: orderStatus.optional(),
	paymentStatus: z.enum(['pending', 'paid', 'refunded']).optional(),
	fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled']).optional(),
	trackingNumber: z.string().trim().max(200).nullable().optional(),
	carrier: z.string().trim().max(150).nullable().optional(),
	estimatedDeliveryAt: z.string().datetime().nullable().optional(),
	note: z.string().trim().min(1).max(2000).optional()
});

export const shipmentCreateSchema = z.object({
	carrier: z.string().trim().min(1).max(150),
	trackingNumber: z.string().trim().min(1).max(200)
});

export const returnListSchema = paginationSchema.extend({
	type: z.enum(['return', 'exchange']).optional()
});

export const returnUpdateSchema = z.object({
	status: z
		.enum(['requested', 'approved', 'rejected', 'received', 'refunded', 'completed'])
		.optional(),
	resolution: z.enum(['original_payment', 'gift_card', 'card']).nullable().optional(),
	refundAmountCents: z.number().int().min(0).nullable().optional(),
	exchangeVariantId: z.string().trim().max(100).nullable().optional(),
	note: z.string().trim().max(2000).nullable().optional()
});

export const customerListSchema = paginationSchema;

export type OrderListQuery = z.infer<typeof orderListSchema>;
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>;
export type ReturnListQuery = z.infer<typeof returnListSchema>;
export type ReturnUpdateInput = z.infer<typeof returnUpdateSchema>;
export type CustomerListQuery = z.infer<typeof customerListSchema>;

export const reviewListSchema = paginationSchema.extend({
	rating: z.coerce.number().int().min(1).max(5).optional(),
	productId: z.string().trim().max(100).optional()
});

export const reviewUpdateSchema = z.object({
	status: z.enum(['pending', 'approved', 'rejected'])
});

export const couponWriteSchema = z.object({
	code: z.string().trim().min(2).max(64),
	type: z.enum(['percentage', 'fixed']),
	value: z.number().int().min(1),
	minSubtotalCents: z.number().int().min(0).default(0),
	maxUses: z.number().int().min(1).nullable().optional(),
	startsAt: z.string().datetime().nullable().optional(),
	endsAt: z.string().datetime().nullable().optional(),
	status: z.enum(['active', 'disabled']).default('active'),
	appliesToJson: z.record(z.string(), z.unknown()).nullable().optional()
});

export const giftCardWriteSchema = z.object({
	code: z.string().trim().min(4).max(64).optional(),
	initialAmountCents: z.number().int().min(1),
	currency: z.string().trim().length(3).default('USD'),
	recipientName: z.string().trim().max(200).nullable().optional(),
	recipientEmail: z.string().trim().email().max(200).nullable().optional(),
	message: z.string().trim().max(1000).nullable().optional(),
	expiresAt: z.string().datetime().nullable().optional()
});

export const giftCardUpdateSchema = z.object({
	status: z.enum(['active', 'redeemed', 'expired', 'disabled']).optional(),
	balanceCents: z.number().int().min(0).optional(),
	recipientName: z.string().trim().max(200).nullable().optional(),
	recipientEmail: z.string().trim().email().max(200).nullable().optional(),
	message: z.string().trim().max(1000).nullable().optional(),
	expiresAt: z.string().datetime().nullable().optional()
});

export const newsletterUpdateSchema = z.object({
	status: z.enum(['subscribed', 'unsubscribed'])
});

export const supportListSchema = paginationSchema.extend({
	priority: z.string().trim().max(20).optional(),
	assignedAdminId: z.string().trim().max(100).optional()
});

export const supportUpdateSchema = z.object({
	status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
	priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
	assignedAdminId: z.string().trim().max(100).nullable().optional()
});

export const supportMessageSchema = z.object({
	body: z.string().trim().min(1).max(5000),
	attachmentsJson: z.array(z.unknown()).nullable().optional()
});

const dateWindowSchema = {
	startsAt: z.string().datetime().nullable().optional(),
	endsAt: z.string().datetime().nullable().optional()
};

export const bannerWriteSchema = z.object({
	key: z.enum(['hero', 'promo', 'cta', 'category']),
	title: z.string().trim().min(1).max(200),
	subtitle: z.string().trim().max(500).nullable().optional(),
	imageUrl: z.string().trim().min(1).max(2000),
	mobileImageUrl: z.string().trim().max(2000).nullable().optional(),
	ctaLabel: z.string().trim().max(100).nullable().optional(),
	ctaUrl: z.string().trim().max(2000).nullable().optional(),
	position: z.number().int().min(0).default(0),
	active: z.boolean().default(true),
	...dateWindowSchema
});

export const announcementWriteSchema = z.object({
	text: z.string().trim().min(1).max(500),
	link: z.string().trim().max(2000).nullable().optional(),
	position: z.number().int().min(0).default(0),
	active: z.boolean().default(true),
	...dateWindowSchema
});

export const testimonialWriteSchema = z.object({
	imageUrl: z.string().trim().min(1).max(2000),
	caption: z.string().trim().max(500).nullable().optional(),
	link: z.string().trim().max(2000).nullable().optional(),
	position: z.number().int().min(0).default(0),
	active: z.boolean().default(true)
});

export const reportRangeSchema = z.object({
	from: z.string().datetime().optional(),
	to: z.string().datetime().optional()
});

export const superUserListSchema = paginationSchema;
export const superRoleSchema = z.object({ role: z.enum(['customer', 'admin', 'superadmin']) });
export const superBanSchema = z.object({
	reason: z.string().trim().min(1).max(500),
	expiresAt: z.string().datetime().nullable().optional()
});
export const settingsWriteSchema = z.record(z.string(), z.unknown());
export const dangerActionSchema = z.object({
	action: z.enum(['purge_archived_products', 'purge_old_audit_logs']),
	confirm: z.literal('DELETE')
});

export type ReviewListQuery = z.infer<typeof reviewListSchema>;
export type CouponWriteInput = z.infer<typeof couponWriteSchema>;
export type GiftCardWriteInput = z.infer<typeof giftCardWriteSchema>;
export type GiftCardUpdateInput = z.infer<typeof giftCardUpdateSchema>;
export type SupportListQuery = z.infer<typeof supportListSchema>;
export type SupportUpdateInput = z.infer<typeof supportUpdateSchema>;
export type BannerWriteInput = z.infer<typeof bannerWriteSchema>;
export type AnnouncementWriteInput = z.infer<typeof announcementWriteSchema>;
export type TestimonialWriteInput = z.infer<typeof testimonialWriteSchema>;
