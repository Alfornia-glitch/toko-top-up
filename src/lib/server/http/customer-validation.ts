import { z } from 'zod';

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const cartAddSchema = z.object({
	variantId: z.string().min(1),
	quantity: z.number().int().min(1).max(99).default(1)
});

export const cartUpdateSchema = z.object({
	quantity: z.number().int().min(0).max(99)
});

export const couponApplySchema = z.object({
	code: z.string().trim().min(1).max(64)
});

export const addressWriteSchema = z.object({
	label: z.string().max(64).optional().nullable(),
	recipientName: z.string().trim().min(1).max(120),
	phone: z.string().trim().max(40).optional().nullable(),
	line1: z.string().trim().min(1).max(200),
	line2: z.string().trim().max(200).optional().nullable(),
	city: z.string().trim().min(1).max(120),
	region: z.string().trim().max(120).optional().nullable(),
	postalCode: z.string().trim().max(32).optional().nullable(),
	country: z.string().trim().min(1).max(120),
	isDefaultShipping: z.boolean().optional(),
	isDefaultBilling: z.boolean().optional()
});

export const paymentMethodWriteSchema = z.object({
	brand: z.string().trim().min(1).max(40),
	last4: z.string().regex(/^\d{4}$/),
	expMonth: z.number().int().min(1).max(12),
	expYear: z.number().int().min(2000).max(2100),
	isDefault: z.boolean().optional()
});

export const checkoutSchema = z.object({
	addressId: z.string().min(1),
	shippingId: z.string().min(1),
	couponCode: z.string().trim().max(64).optional().nullable(),
	note: z.string().max(500).optional().nullable(),
	payment: z.object({
		mode: z.enum(['card', 'cod', 'gift', 'qris']),
		paymentMethodId: z.string().optional().nullable(),
		brand: z.string().max(40).optional().nullable(),
		last4: z
			.string()
			.regex(/^\d{4}$/)
			.optional()
			.nullable(),
		expMonth: z.number().int().min(1).max(12).optional().nullable(),
		expYear: z.number().int().min(2000).max(2100).optional().nullable()
	})
});

export const returnCreateSchema = z.object({
	orderItemId: z.string().min(1),
	type: z.enum(['return', 'exchange']),
	reason: z.string().trim().min(1).max(300),
	note: z.string().max(1000).optional().nullable(),
	resolution: z.enum(['original_payment', 'gift_card', 'card']).optional().nullable()
});

export const ticketCreateSchema = z.object({
	subject: z.string().trim().min(1).max(200),
	category: z.string().trim().min(1).max(80),
	priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
	orderId: z.string().optional().nullable(),
	message: z.string().trim().min(1).max(4000)
});

export const ticketMessageSchema = z.object({
	body: z.string().trim().min(1).max(4000)
});

export const newsletterSubscribeSchema = z.object({
	email: z.string().email().max(200)
});

export const wishlistAddSchema = z.object({
	productId: z.string().min(1)
});

export const reviewCreateSchema = z.object({
	productId: z.string().min(1),
	rating: z.number().int().min(1).max(5),
	title: z.string().trim().max(160).optional().nullable(),
	body: z.string().trim().max(4000).optional().nullable()
});

export const orderListQuerySchema = paginationQuerySchema;
export const returnListQuerySchema = paginationQuerySchema;
export const ticketListQuerySchema = paginationQuerySchema;

export type CartAddInput = z.infer<typeof cartAddSchema>;
export type CartUpdateInput = z.infer<typeof cartUpdateSchema>;
export type CouponApplyInput = z.infer<typeof couponApplySchema>;
export type AddressWriteInput = z.infer<typeof addressWriteSchema>;
export type PaymentMethodWriteInput = z.infer<typeof paymentMethodWriteSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReturnCreateInput = z.infer<typeof returnCreateSchema>;
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type TicketMessageInput = z.infer<typeof ticketMessageSchema>;
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;
export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;
export type WishlistAddInput = z.infer<typeof wishlistAddSchema>;
