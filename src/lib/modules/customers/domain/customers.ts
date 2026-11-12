export interface Address {
	id: string;
	userId: string;
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
	createdAt: Date;
	updatedAt: Date;
}

export interface AddressInput {
	label?: string | null | undefined;
	recipientName: string;
	phone?: string | null | undefined;
	line1: string;
	line2?: string | null | undefined;
	city: string;
	region?: string | null | undefined;
	postalCode?: string | null | undefined;
	country: string;
	isDefaultShipping?: boolean | undefined;
	isDefaultBilling?: boolean | undefined;
}

export interface WishlistEntry {
	id: string;
	userId: string;
	productId: string;
	createdAt: Date;
}

export interface CustomerListQuery {
	q?: string | undefined;
	sort?: string | undefined;
	page: number;
	pageSize: number;
}

export interface CustomerSummary {
	id: string;
	name: string;
	email: string;
	image: string | null;
	createdAt: Date;
	orderCount: number;
	spentCents: number;
}

export interface CustomerOrderSummary {
	id: string;
	orderNumber: string;
	status: string;
	paymentStatus: string;
	grandTotalCents: number;
	currency: string;
	placedAt: Date;
}

export interface CustomerProfile {
	id: string;
	name: string;
	email: string;
	image: string | null;
	emailVerified: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface CustomerDetail extends CustomerProfile {
	orders: CustomerOrderSummary[];
	addresses: Address[];
	orderCount: number;
	spentCents: number;
}

/**
 * Read-only port over data the customers module does not own: user accounts
 * (platform auth) and order history (orders module). The runtime supplies the
 * adapter, so the module never imports those schemas.
 */
export interface CustomerDirectory {
	list(query: CustomerListQuery): Promise<{ data: CustomerSummary[]; total: number }>;
	findProfile(
		id: string
	): Promise<{ profile: CustomerProfile; orders: CustomerOrderSummary[] } | null>;
}

export interface CustomerRepository {
	listAddresses(userId: string): Promise<Address[]>;
	findAddress(userId: string, id: string): Promise<Address | null>;
	/** Inserts the address, clearing the user's other defaults when this one claims them. */
	insertAddress(address: Address): Promise<void>;
	/** Applies the patch, clearing the user's other defaults when it claims them. */
	updateAddress(userId: string, id: string, patch: Partial<Address>): Promise<void>;
	deleteAddress(userId: string, id: string): Promise<void>;

	listWishlist(userId: string): Promise<WishlistEntry[]>;
	findWishlist(userId: string, productId: string): Promise<WishlistEntry | null>;
	insertWishlist(entry: WishlistEntry): Promise<void>;
	deleteWishlist(userId: string, productId: string): Promise<void>;
}

/** Builds the column patch for an address update; absent optional fields are left unchanged. */
export function addressPatch(input: AddressInput, now: Date): Partial<Address> {
	const patch: Partial<Address> = {
		recipientName: input.recipientName,
		line1: input.line1,
		city: input.city,
		country: input.country,
		updatedAt: now
	};

	if (input.label !== undefined) patch.label = input.label;
	if (input.phone !== undefined) patch.phone = input.phone;
	if (input.line2 !== undefined) patch.line2 = input.line2;
	if (input.region !== undefined) patch.region = input.region;
	if (input.postalCode !== undefined) patch.postalCode = input.postalCode;
	if (input.isDefaultShipping !== undefined) patch.isDefaultShipping = input.isDefaultShipping;
	if (input.isDefaultBilling !== undefined) patch.isDefaultBilling = input.isDefaultBilling;

	return patch;
}
