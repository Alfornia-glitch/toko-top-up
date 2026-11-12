import {
	NotFoundError,
	assertActor,
	assertPermission,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import {
	addressPatch,
	type Address,
	type AddressInput,
	type CustomerDetail,
	type CustomerDirectory,
	type CustomerListQuery,
	type CustomerRepository,
	type CustomerSummary,
	type WishlistEntry
} from '../domain/customers.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

export interface CustomerService {
	/** Address and wishlist operations act on the calling actor's own records. */
	listAddresses(actor: Actor | null): Outcome<Address[]>;
	getAddress(id: string, actor: Actor | null): Outcome<Address>;
	createAddress(input: AddressInput, actor: Actor | null): Outcome<Address>;
	updateAddress(id: string, input: AddressInput, actor: Actor | null): Outcome<Address>;
	deleteAddress(id: string, actor: Actor | null): Outcome<string>;

	listWishlist(actor: Actor | null): Outcome<WishlistEntry[]>;
	/** Idempotent: returns the existing entry when the product is already wishlisted. */
	addWishlist(productId: string, actor: Actor | null): Outcome<WishlistEntry>;
	removeWishlist(productId: string, actor: Actor | null): Outcome<string>;

	listCustomers(
		query: CustomerListQuery,
		actor: Actor | null
	): Outcome<{ data: CustomerSummary[]; page: number; pageSize: number; total: number }>;
	getCustomer(id: string, actor: Actor | null): Outcome<CustomerDetail>;
}

export function createCustomerService(
	repository: CustomerRepository,
	directory: CustomerDirectory,
	clock: Clock = systemClock
): CustomerService {
	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	async function ownedAddress(userId: string, id: string): Promise<Address> {
		const address = await repository.findAddress(userId, id);
		if (!address) throw new NotFoundError('Address not found');
		return address;
	}

	return {
		listAddresses: (actor) => run(async () => repository.listAddresses(assertActor(actor).id)),

		getAddress: (id, actor) => run(async () => ownedAddress(assertActor(actor).id, id)),

		createAddress: (input, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const now = clock.now();
				const id = newId();
				await repository.insertAddress({
					id,
					userId,
					label: input.label ?? null,
					recipientName: input.recipientName,
					phone: input.phone ?? null,
					line1: input.line1,
					line2: input.line2 ?? null,
					city: input.city,
					region: input.region ?? null,
					postalCode: input.postalCode ?? null,
					country: input.country,
					isDefaultShipping: input.isDefaultShipping ?? false,
					isDefaultBilling: input.isDefaultBilling ?? false,
					createdAt: now,
					updatedAt: now
				});
				return ownedAddress(userId, id);
			}),

		updateAddress: (id, input, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				await ownedAddress(userId, id);
				await repository.updateAddress(userId, id, addressPatch(input, clock.now()));
				return ownedAddress(userId, id);
			}),

		deleteAddress: (id, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				await ownedAddress(userId, id);
				await repository.deleteAddress(userId, id);
				return id;
			}),

		listWishlist: (actor) => run(async () => repository.listWishlist(assertActor(actor).id)),

		addWishlist: (productId, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				const existing = await repository.findWishlist(userId, productId);
				if (existing) return existing;

				await repository.insertWishlist({ id: newId(), userId, productId, createdAt: clock.now() });
				const created = await repository.findWishlist(userId, productId);
				if (!created) throw new NotFoundError('Wishlist item not found');
				return created;
			}),

		removeWishlist: (productId, actor) =>
			run(async () => {
				const userId = assertActor(actor).id;
				if (!(await repository.findWishlist(userId, productId))) {
					throw new NotFoundError('Wishlist item not found');
				}
				await repository.deleteWishlist(userId, productId);
				return productId;
			}),

		listCustomers: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const { data, total } = await directory.list(query);
				return { data, page: query.page, pageSize: query.pageSize, total };
			}),

		getCustomer: (id, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const found = await directory.findProfile(id);
				if (!found) throw new NotFoundError('Customer not found');

				const addresses = await repository.listAddresses(id);
				const spentCents = found.orders.reduce((total, order) => total + order.grandTotalCents, 0);

				return {
					...found.profile,
					orders: found.orders,
					addresses,
					orderCount: found.orders.length,
					spentCents
				};
			})
	};
}
