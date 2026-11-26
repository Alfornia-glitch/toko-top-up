import type { CustomerDirectory } from '#modules/customers/server.ts';

const created = new Date('2026-01-01T00:00:00.000Z');

/** In-memory stand-in for the runtime's user/order adapter: one customer with one order. */
export function createFakeCustomerDirectory(): CustomerDirectory {
	const profile = {
		id: 'directory-customer',
		name: 'Dina',
		email: 'dina@example.test',
		image: null,
		emailVerified: true,
		createdAt: created,
		updatedAt: created
	};
	const orders = [
		{
			id: 'order-1',
			orderNumber: 'SO-1',
			status: 'paid',
			paymentStatus: 'paid',
			grandTotal: 2500,
			currency: 'USD',
			placedAt: created
		}
	];

	return {
		async list() {
			return {
				data: [
					{
						id: profile.id,
						name: profile.name,
						email: profile.email,
						image: null,
						createdAt: created,
						orderCount: 1,
						spent: 2500
					}
				],
				total: 1
			};
		},
		async findProfile(id) {
			return id === profile.id ? { profile, orders } : null;
		}
	};
}
