import { and, desc, eq, ne } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import type { Address, CustomerRepository, PaymentMethod } from '../../domain/customers.ts';
import { addresses, paymentMethods, wishlists } from './schema.ts';

export function createSqliteCustomerRepository(db: SqliteDb): CustomerRepository {
	function ownedBy(userId: string, id: string) {
		return and(eq(addresses.id, id), eq(addresses.userId, userId));
	}

	return {
		async listAddresses(userId) {
			return db
				.select()
				.from(addresses)
				.where(eq(addresses.userId, userId))
				.orderBy(desc(addresses.isDefaultShipping), desc(addresses.createdAt));
		},

		async findAddress(userId, id) {
			const [row] = await db.select().from(addresses).where(ownedBy(userId, id)).limit(1);
			return row ?? null;
		},

		async insertAddress(address: Address) {
			db.transaction((tx) => {
				if (address.isDefaultShipping) {
					tx.update(addresses)
						.set({ isDefaultShipping: false, updatedAt: address.updatedAt })
						.where(and(eq(addresses.userId, address.userId), eq(addresses.isDefaultShipping, true)))
						.run();
				}
				if (address.isDefaultBilling) {
					tx.update(addresses)
						.set({ isDefaultBilling: false, updatedAt: address.updatedAt })
						.where(and(eq(addresses.userId, address.userId), eq(addresses.isDefaultBilling, true)))
						.run();
				}
				tx.insert(addresses).values(address).run();
			});
		},

		async updateAddress(userId, id, patch) {
			const updatedAt = patch.updatedAt ?? new Date();
			db.transaction((tx) => {
				if (patch.isDefaultShipping) {
					tx.update(addresses)
						.set({ isDefaultShipping: false, updatedAt })
						.where(
							and(
								eq(addresses.userId, userId),
								eq(addresses.isDefaultShipping, true),
								ne(addresses.id, id)
							)
						)
						.run();
				}
				if (patch.isDefaultBilling) {
					tx.update(addresses)
						.set({ isDefaultBilling: false, updatedAt })
						.where(
							and(
								eq(addresses.userId, userId),
								eq(addresses.isDefaultBilling, true),
								ne(addresses.id, id)
							)
						)
						.run();
				}
				tx.update(addresses).set(patch).where(ownedBy(userId, id)).run();
			});
		},

		async deleteAddress(userId, id) {
			await db.delete(addresses).where(ownedBy(userId, id));
		},

		async listPaymentMethods(userId) {
			return db
				.select()
				.from(paymentMethods)
				.where(and(eq(paymentMethods.userId, userId), ne(paymentMethods.status, 'removed')))
				.orderBy(desc(paymentMethods.isDefault), desc(paymentMethods.createdAt));
		},

		async findPaymentMethod(userId, id) {
			const [row] = await db
				.select()
				.from(paymentMethods)
				.where(
					and(
						eq(paymentMethods.id, id),
						eq(paymentMethods.userId, userId),
						ne(paymentMethods.status, 'removed')
					)
				)
				.limit(1);
			return row ?? null;
		},

		async insertPaymentMethod(method: PaymentMethod) {
			db.transaction((tx) => {
				if (method.isDefault) {
					tx.update(paymentMethods)
						.set({ isDefault: false, updatedAt: method.updatedAt })
						.where(eq(paymentMethods.userId, method.userId))
						.run();
				}
				tx.insert(paymentMethods).values(method).run();
			});
		},

		async updatePaymentMethod(userId, id, patch) {
			const updatedAt = patch.updatedAt ?? new Date();
			db.transaction((tx) => {
				if (patch.isDefault) {
					tx.update(paymentMethods)
						.set({ isDefault: false, updatedAt })
						.where(and(eq(paymentMethods.userId, userId), ne(paymentMethods.id, id)))
						.run();
				}
				tx.update(paymentMethods)
					.set(patch)
					.where(and(eq(paymentMethods.id, id), eq(paymentMethods.userId, userId)))
					.run();
			});
		},

		async listWishlist(userId) {
			return db
				.select()
				.from(wishlists)
				.where(eq(wishlists.userId, userId))
				.orderBy(desc(wishlists.createdAt));
		},

		async findWishlist(userId, productId) {
			const [row] = await db
				.select()
				.from(wishlists)
				.where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
				.limit(1);
			return row ?? null;
		},

		async insertWishlist(entry) {
			await db.insert(wishlists).values(entry).onConflictDoNothing();
		},

		async deleteWishlist(userId, productId) {
			await db
				.delete(wishlists)
				.where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)));
		}
	};
}
