import { z } from 'zod';
import { STORE_NAME_MAX_LENGTH } from '#modules/storefront/index.ts';
import { THEME_MODES } from '#shared/theme.ts';

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

export type MediaListQuery = z.infer<typeof mediaListSchema>;

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
	refundAmount: z.number().int().min(0).nullable().optional(),
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
	minSubtotal: z.number().int().min(0).default(0),
	maxUses: z.number().int().min(1).nullable().optional(),
	startsAt: z.string().datetime().nullable().optional(),
	endsAt: z.string().datetime().nullable().optional(),
	status: z.enum(['active', 'disabled']).default('active'),
	appliesToJson: z.record(z.string(), z.unknown()).nullable().optional()
});

export const giftCardWriteSchema = z.object({
	code: z.string().trim().min(4).max(64).optional(),
	initialAmount: z.number().int().min(1),
	currency: z.string().trim().length(3).default('USD'),
	recipientName: z.string().trim().max(200).nullable().optional(),
	recipientEmail: z.string().trim().email().max(200).nullable().optional(),
	message: z.string().trim().max(1000).nullable().optional(),
	expiresAt: z.string().datetime().nullable().optional()
});

export const giftCardUpdateSchema = z.object({
	status: z.enum(['active', 'redeemed', 'expired', 'disabled']).optional(),
	balance: z.number().int().min(0).optional(),
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
/** Store name and logo. The logo is a media id from `/api/upload` (folder `store`), never a raw URL. */
export const storeIdentityWriteSchema = z.object({
	storeName: z.string().trim().min(1).max(STORE_NAME_MAX_LENGTH),
	logoMediaId: z.string().trim().min(1).max(100).nullable().optional()
});
/** Unknown tokens and invalid colours are dropped by `sanitizeTheme`; only the shape is checked here. */
export const themeWriteSchema = z.object({
	mode: z.enum(THEME_MODES),
	radius: z.string().trim().max(10),
	light: z.record(z.string(), z.string().max(80)),
	dark: z.record(z.string(), z.string().max(80))
});
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
