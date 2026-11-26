import { beforeEach, describe, expect, test } from 'vitest';
import { unwrap, type Actor } from '#shared';
import type { CustomerService } from '#modules/customers/server.ts';
import type { AddressInput } from '#modules/customers/index.ts';
import type { TestClock } from '../support/clock.ts';
import { createAdminActor, createForbiddenActor } from '../support/actor.ts';

const START = new Date('2026-01-01T00:00:00.000Z');

export interface CustomersContractContext {
	service: CustomerService;
	clock: TestClock;
	reset(): Promise<void>;
}

function customerActor(id: string): Actor {
	return { ...createForbiddenActor(id), id };
}

const home: AddressInput = {
	label: 'Home',
	recipientName: 'Ada',
	line1: '1 Main St',
	city: 'Jakarta',
	country: 'ID',
	isDefaultShipping: true
};

export function runCustomersContract({ service, clock, reset }: CustomersContractContext): void {
	const ada = customerActor('customer-ada');
	const bob = customerActor('customer-bob');

	beforeEach(async () => {
		await reset();
		clock.set(START);
	});

	describe('addresses contract', () => {
		test('creates, lists, updates and deletes an address', async () => {
			const created = unwrap(await service.createAddress(home, ada));
			expect(created).toMatchObject({ userId: ada.id, label: 'Home', line2: null });

			const updated = unwrap(
				await service.updateAddress(created.id, { ...home, city: 'Bandung' }, ada)
			);
			expect(updated.city).toBe('Bandung');
			expect(updated.label).toBe('Home');

			expect(unwrap(await service.listAddresses(ada))).toHaveLength(1);
			expect(unwrap(await service.deleteAddress(created.id, ada))).toBe(created.id);
			expect(unwrap(await service.listAddresses(ada))).toEqual([]);
		});

		test('a new default replaces the previous default only for the same user', async () => {
			const first = unwrap(await service.createAddress(home, ada));
			const other = unwrap(await service.createAddress(home, bob));
			const second = unwrap(await service.createAddress({ ...home, line1: '2 Side St' }, ada));

			const list = unwrap(await service.listAddresses(ada));
			expect(list.find((a) => a.id === first.id)?.isDefaultShipping).toBe(false);
			expect(list.find((a) => a.id === second.id)?.isDefaultShipping).toBe(true);
			expect(unwrap(await service.getAddress(other.id, bob)).isDefaultShipping).toBe(true);

			unwrap(await service.updateAddress(first.id, { ...home, isDefaultShipping: true }, ada));
			const after = unwrap(await service.listAddresses(ada));
			expect(after.filter((a) => a.isDefaultShipping).map((a) => a.id)).toEqual([first.id]);
		});

		test('addresses are private to their owner and need an actor', async () => {
			const created = unwrap(await service.createAddress(home, ada));

			for (const result of [
				await service.getAddress(created.id, bob),
				await service.updateAddress(created.id, home, bob),
				await service.deleteAddress(created.id, bob)
			]) {
				expect(result.ok).toBe(false);
				if (!result.ok) expect(result.error.status).toBe(404);
			}

			const anonymous = await service.listAddresses(null);
			expect(anonymous.ok).toBe(false);
			if (!anonymous.ok) expect(anonymous.error.status).toBe(401);
		});
	});

	describe('payment methods contract', () => {
		const visa = { brand: 'Visa', last4: '4242', expMonth: 12, expYear: 2030 };

		test('creates, updates and soft-deletes a method', async () => {
			const created = unwrap(await service.createPaymentMethod({ ...visa, isDefault: true }, ada));
			expect(created).toMatchObject({
				brand: 'Visa',
				last4: '4242',
				isDefault: true,
				status: 'active'
			});
			expect(created).not.toHaveProperty('userId');

			const updated = unwrap(
				await service.updatePaymentMethod(created.id, { ...visa, expYear: 2031 }, ada)
			);
			expect(updated).toMatchObject({ expYear: 2031, isDefault: true });

			expect(unwrap(await service.deletePaymentMethod(created.id, ada))).toBe(created.id);
			expect(unwrap(await service.listPaymentMethods(ada))).toEqual([]);
			const gone = await service.updatePaymentMethod(created.id, visa, ada);
			expect(gone.ok).toBe(false);
		});

		test('only one default per user, and other users are unaffected', async () => {
			const first = unwrap(await service.createPaymentMethod({ ...visa, isDefault: true }, ada));
			const other = unwrap(await service.createPaymentMethod({ ...visa, isDefault: true }, bob));
			const second = unwrap(
				await service.createPaymentMethod({ ...visa, last4: '1111', isDefault: true }, ada)
			);

			const list = unwrap(await service.listPaymentMethods(ada));
			expect(list.find((m) => m.id === first.id)?.isDefault).toBe(false);
			expect(list[0]?.id).toBe(second.id);
			expect(unwrap(await service.listPaymentMethods(bob))[0]).toMatchObject({
				id: other.id,
				isDefault: true
			});

			unwrap(await service.updatePaymentMethod(first.id, { ...visa, isDefault: true }, ada));
			const after = unwrap(await service.listPaymentMethods(ada));
			expect(after.filter((m) => m.isDefault).map((m) => m.id)).toEqual([first.id]);
		});

		test("another customer's method reads as not found", async () => {
			const created = unwrap(await service.createPaymentMethod(visa, ada));
			for (const result of [
				await service.updatePaymentMethod(created.id, visa, bob),
				await service.deletePaymentMethod(created.id, bob)
			]) {
				expect(result.ok).toBe(false);
				if (!result.ok) expect(result.error.status).toBe(404);
			}
		});
	});

	describe('wishlist contract', () => {
		test('adding is idempotent and removing reports missing items', async () => {
			const first = unwrap(await service.addWishlist('product-1', ada));
			const again = unwrap(await service.addWishlist('product-1', ada));
			expect(again.id).toBe(first.id);

			clock.set(new Date('2026-01-02T00:00:00.000Z'));
			unwrap(await service.addWishlist('product-2', ada));
			expect(unwrap(await service.listWishlist(ada)).map((e) => e.productId)).toEqual([
				'product-2',
				'product-1'
			]);
			expect(unwrap(await service.listWishlist(bob))).toEqual([]);

			expect(unwrap(await service.removeWishlist('product-1', ada))).toBe('product-1');
			const missing = await service.removeWishlist('product-1', ada);
			expect(missing.ok).toBe(false);
			if (!missing.ok) expect(missing.error.status).toBe(404);
		});
	});

	describe('directory contract', () => {
		const admin = createAdminActor('customers-admin');

		test('lists customers and composes detail with addresses', async () => {
			const list = unwrap(await service.listCustomers({ page: 1, pageSize: 10 }, admin));
			expect(list).toMatchObject({ page: 1, pageSize: 10, total: 1 });

			unwrap(await service.createAddress(home, customerActor('directory-customer')));
			const detail = unwrap(await service.getCustomer('directory-customer', admin));
			expect(detail).toMatchObject({ orderCount: 1, spent: 2500 });
			expect(detail.addresses).toHaveLength(1);

			const missing = await service.getCustomer('nobody', admin);
			expect(missing.ok).toBe(false);
		});

		test('requires admin access', async () => {
			const denied = await service.listCustomers({ page: 1, pageSize: 10 }, ada);
			expect(denied.ok).toBe(false);
			if (!denied.ok) expect(denied.error.status).toBe(403);
		});
	});
}
