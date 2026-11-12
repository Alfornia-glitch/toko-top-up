import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import type { CartRepository } from '../../domain/cart.ts';
import { cartItems, carts } from './schema.ts';

export function createSqliteCartRepository(db: SqliteDb): CartRepository {
	return {
		async findCart(id) {
			const [row] = await db.select().from(carts).where(eq(carts.id, id)).limit(1);
			return row ?? null;
		},

		async findActiveCartId(userId) {
			const [row] = await db
				.select({ id: carts.id })
				.from(carts)
				.where(and(eq(carts.userId, userId), eq(carts.status, 'active')))
				.orderBy(desc(carts.updatedAt), desc(carts.createdAt))
				.limit(1);
			return row?.id ?? null;
		},

		async insertCart(cart) {
			await db.insert(carts).values(cart);
		},

		async updateCart(id, patch) {
			await db.update(carts).set(patch).where(eq(carts.id, id));
		},

		async listItems(cartId) {
			return db
				.select()
				.from(cartItems)
				.where(eq(cartItems.cartId, cartId))
				.orderBy(asc(cartItems.createdAt));
		},

		async findItem(cartId, itemId) {
			const [row] = await db
				.select()
				.from(cartItems)
				.where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
				.limit(1);
			return row ?? null;
		},

		async findItemByVariant(cartId, variantId) {
			const [row] = await db
				.select()
				.from(cartItems)
				.where(and(eq(cartItems.cartId, cartId), eq(cartItems.variantId, variantId)))
				.limit(1);
			return row ?? null;
		},

		async insertItem(item) {
			await db.insert(cartItems).values(item);
		},

		async updateItem(id, patch) {
			await db.update(cartItems).set(patch).where(eq(cartItems.id, id));
		},

		async deleteItem(cartId, itemId) {
			await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
		},

		async deleteItems(cartId) {
			await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
		},

		async applyMerge(plan) {
			// bun-sqlite transactions are synchronous: no async callback, no await.
			db.transaction((tx) => {
				if (plan.inserts.length) tx.insert(cartItems).values(plan.inserts).run();
				for (const update of plan.updates) {
					tx.update(cartItems)
						.set({ quantity: update.quantity, updatedAt: plan.now })
						.where(eq(cartItems.id, update.id))
						.run();
				}
				if (plan.deletes.length) {
					tx.delete(cartItems).where(inArray(cartItems.id, plan.deletes)).run();
				}
				tx.delete(cartItems).where(eq(cartItems.cartId, plan.guestCartId)).run();
				tx.update(carts)
					.set({ status: 'abandoned', updatedAt: plan.now })
					.where(eq(carts.id, plan.guestCartId))
					.run();
				tx.update(carts).set({ updatedAt: plan.now }).where(eq(carts.id, plan.userCartId)).run();
			});
		}
	};
}
