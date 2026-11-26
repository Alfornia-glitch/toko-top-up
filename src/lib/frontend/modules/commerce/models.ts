export interface Banner {
	id: string;
	key: 'hero' | 'promo' | 'cta' | 'category';
	title: string;
	subtitle: string | null;
	imageUrl: string;
	mobileImageUrl: string | null;
	ctaLabel: string | null;
	ctaUrl: string | null;
	position: number;
}

export interface Announcement {
	id: string;
	text: string;
	link: string | null;
	position: number;
}

export interface Testimonial {
	id: string;
	imageUrl: string;
	caption: string | null;
	link: string | null;
	position: number;
}

export interface StorefrontCategory {
	id: string;
	name: string;
	slug: string;
	parentId: string | null;
	description: string | null;
	imageUrl: string | null;
	position: number;
	productCount: number;
}

export interface StorefrontBrand {
	id: string;
	name: string;
	slug: string;
	logoUrl: string | null;
}

export interface StorefrontProduct {
	id: string;
	sku: string;
	name: string;
	slug: string;
	shortDescription: string | null;
	price: number;
	compareAtPrice: number | null;
	currency: string;
	ratingAvg: number;
	ratingCount: number;
	soldCount: number;
	isFeatured: boolean;
	isNewArrival: boolean;
	isDeal: boolean;
	brandName: string | null;
	categoryName: string | null;
	imageUrl: string | null;
	stock: number;
	dealEndsAt?: string | null;
}

export interface WishlistItem extends StorefrontProduct {
	wishlistedAt: string;
}

export interface ProductReview {
	id: string;
	rating: number;
	title: string | null;
	body: string | null;
	helpfulCount: number;
	createdAt: string;
	customerName: string | null;
	customerImage: string | null;
}

export interface ProductImage {
	id: string;
	url: string;
	alt: string | null;
	position: number;
}

export interface ProductOptionValue {
	value: string;
	colorHex: string | null;
}

export interface ProductOption {
	id: string;
	name: string;
	values: ProductOptionValue[];
}

export interface ProductVariant {
	id: string;
	sku: string;
	name: string;
	price: number;
	compareAtPrice: number | null;
	stock: number;
	optionValuesJson: Record<string, string> | null;
}

export interface ProductDetail extends StorefrontProduct {
	description: string | null;
	shippingInfo: string | null;
	returnPolicy: string | null;
	images: ProductImage[];
	options: ProductOption[];
	variants: ProductVariant[];
	reviews: ProductReview[];
	ratingBuckets: Record<'1' | '2' | '3' | '4' | '5', number>;
	related: StorefrontProduct[];
}

export interface ProductFacets {
	brands: { id: string; name: string; slug: string; logoUrl: string | null }[];
	categories: { id: string; name: string; slug: string }[];
	price: { min: number; max: number };
	colors: string[];
	discounts: number[];
}

export interface ProductListResult {
	data: StorefrontProduct[];
	page: number;
	pageSize: number;
	total: number;
	facets: ProductFacets;
}

export interface ShippingOption {
	id: string;
	label: string;
	description: string;
	price: number;
	minDays: number;
	maxDays: number;
}

export interface SiteSettings {
	contact: { address1: string; address2: string; phone: string; email: string };
	social: { instagram: string; facebook: string; twitter: string };
	downloads: { appStore: string; googlePlay: string };
	shipping: ShippingOption[];
	currency: string;
	storefrontLayout: 'regular' | 'topup';
}

export interface HomeData {
	banners: Banner[];
	announcements: Announcement[];
	testimonials: Testimonial[];
	categories: StorefrontCategory[];
	brands: StorefrontBrand[];
	deals: StorefrontProduct[];
	newArrivals: StorefrontProduct[];
	featured: StorefrontProduct[];
	popular: StorefrontProduct[];
}

export interface CartItem {
	id: string;
	variantId: string;
	productId: string;
	productSlug: string;
	productName: string;
	variantName: string;
	brandName: string | null;
	imageUrl: string | null;
	unitPrice: number;
	compareAtPrice: number | null;
	quantity: number;
	stock: number;
}

export interface CartCoupon {
	code: string;
	type: 'percentage' | 'fixed';
	value: number;
}

export interface Cart {
	id: string;
	items: CartItem[];
	subtotal: number;
	discount: number;
	shipping: number;
	total: number;
	currency: string;
	itemCount: number;
	coupon: CartCoupon | null;
}

export interface Address {
	id: string;
	label: string | null;
	recipientName: string;
	phone: string | null;
	line1: string;
	line2: string | null;
	city: string;
	region: string | null;
	postalCode: string | null;
	country: string;
	isDefaultShipping: boolean;
	isDefaultBilling: boolean;
}

export interface PaymentMethod {
	id: string;
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
	isDefault: boolean;
	status: 'active' | 'expired' | 'removed';
}

export interface OrderItem {
	id: string;
	productId: string | null;
	variantId: string | null;
	productName: string;
	sku: string;
	imageUrl: string | null;
	quantity: number;
	unitPrice: number;
	total: number;
	status: string;
}

export interface OrderEvent {
	id: string;
	type: string;
	message: string | null;
	createdAt: string;
}

export interface Shipment {
	id: string;
	carrier: string;
	trackingNumber: string;
	status: string;
	shippedAt: string | null;
	deliveredAt: string | null;
}

export interface OrderSummary {
	id: string;
	orderNumber: string;
	status: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	grandTotal: number;
	currency: string;
	placedAt: string;
	itemCount?: number;
}

export interface OrderDetail extends OrderSummary {
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	shippingAddress: Record<string, unknown> | null;
	billingAddress: Record<string, unknown> | null;
	trackingNumber: string | null;
	carrier: string | null;
	estimatedDeliveryAt: string | null;
	items: OrderItem[];
	events: OrderEvent[];
	shipments: Shipment[];
}

export interface ReturnSummary {
	id: string;
	orderId: string;
	orderNumber: string;
	orderItemId: string;
	productName: string;
	sku: string;
	type: 'return' | 'exchange';
	reason: string;
	status: string;
	resolution: string | null;
	refundAmount: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface ReturnDetail extends ReturnSummary {
	note: string | null;
	images: { id: string; url: string }[];
}

export interface SupportTicketSummary {
	id: string;
	ticketNumber: string;
	subject: string;
	category: string;
	priority: string;
	status: string;
	orderId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SupportMessage {
	id: string;
	senderUserId: string;
	senderName: string | null;
	senderEmail: string | null;
	body: string;
	attachmentsJson: unknown[] | null;
	createdAt: string;
}

export interface SupportTicketDetail extends SupportTicketSummary {
	messages: SupportMessage[];
}

export interface GiftCardSummary {
	id: string;
	code: string;
	initialAmount: number;
	balance: number;
	currency: string;
	status: string;
	expiresAt: string | null;
	createdAt: string;
}

export interface NewsletterSubscription {
	id: string;
	email: string;
	status: 'subscribed' | 'unsubscribed';
	createdAt: string;
}
