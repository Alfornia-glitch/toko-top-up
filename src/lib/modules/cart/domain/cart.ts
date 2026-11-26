export type CartStatus = 'active' | 'converted' | 'abandoned';

export interface CartRecord {
	id: string;
	userId: string | null;
	status: CartStatus;
	currency: string;
	couponId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CartItemRecord {
	id: string;
	cartId: string;
	variantId: string;
	quantity: number;
	unitPrice: number;
	createdAt: Date;
	updatedAt: Date;
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

export interface MergePlan {
	guestCartId: string;
	userCartId: string;
	inserts: CartItemRecord[];
	updates: Array<{ id: string; quantity: number }>;
	deletes: string[];
	now: Date;
}

export interface CartRepository {
	findCart(id: string): Promise<CartRecord | null>;
	findActiveCartId(userId: string): Promise<string | null>;
	insertCart(cart: CartRecord): Promise<void>;
	updateCart(id: string, patch: Partial<CartRecord>): Promise<void>;

	listItems(cartId: string): Promise<CartItemRecord[]>;
	findItem(cartId: string, itemId: string): Promise<CartItemRecord | null>;
	findItemByVariant(cartId: string, variantId: string): Promise<CartItemRecord | null>;
	insertItem(item: CartItemRecord): Promise<void>;
	updateItem(id: string, patch: Partial<CartItemRecord>): Promise<void>;
	deleteItem(cartId: string, itemId: string): Promise<void>;
	deleteItems(cartId: string): Promise<void>;
	/** Applies the whole merge atomically: item changes, guest cart emptied and abandoned, user cart touched. */
	applyMerge(plan: MergePlan): Promise<void>;
}

export function emptyCart(cartId: string, currency = 'IDR'): Cart {
	return {
		id: cartId,
		items: [],
		subtotal: 0,
		discount: 0,
		shipping: 0,
		total: 0,
		currency,
		itemCount: 0,
		coupon: null
	};
}
