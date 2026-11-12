export interface CheckoutInput {
	addressId: string;
	shippingId: string;
	note?: string | null | undefined;
}

export interface PlacedOrder {
	orderId: string;
	orderNumber: string;
}

export interface ShippingMethod {
	id: string;
	priceCents: number;
}

/**
 * Port over the storefront settings checkout depends on (shipping methods and
 * the default currency). Those live in site settings, so the runtime supplies the adapter.
 */
export interface CheckoutSettings {
	getShippingMethod(id: string): Promise<ShippingMethod | null>;
	getCurrency(): Promise<string>;
}

export interface OrderLine {
	productId: string;
	variantId: string;
	productNameSnapshot: string;
	skuSnapshot: string;
	imageUrlSnapshot: string | null;
	quantity: number;
	unitPriceCents: number;
	totalCents: number;
}
