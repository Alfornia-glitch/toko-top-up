import { and, desc, eq, ne } from 'drizzle-orm';
import { queryDb, tables } from '#db/query.ts';
import type { AddressWriteInput } from '#lib/server/modules/customer/validation.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = tables as any;

async function findOwnedAddress(userId: string, id: string) {
	const [address] = await queryDb
		.select()
		.from(t.addresses)
		.where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId)))
		.limit(1);

	return address ?? null;
}

export async function listAddresses(userId: string) {
	return queryDb
		.select()
		.from(t.addresses)
		.where(eq(t.addresses.userId, userId))
		.orderBy(desc(t.addresses.isDefaultShipping), desc(t.addresses.createdAt));
}

export async function createAddress(userId: string, input: AddressWriteInput) {
	const id = crypto.randomUUID();
	const now = new Date();

	const values = {
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
	};

	await queryDb.transaction(async (tx: any) => {
		if (values.isDefaultShipping) {
			await tx
				.update(t.addresses)
				.set({ isDefaultShipping: false, updatedAt: now })
				.where(and(eq(t.addresses.userId, userId), eq(t.addresses.isDefaultShipping, true)));
		}

		if (values.isDefaultBilling) {
			await tx
				.update(t.addresses)
				.set({ isDefaultBilling: false, updatedAt: now })
				.where(and(eq(t.addresses.userId, userId), eq(t.addresses.isDefaultBilling, true)));
		}

		await tx.insert(t.addresses).values(values);
	});

	return findOwnedAddress(userId, id);
}

export async function updateAddress(userId: string, id: string, input: AddressWriteInput) {
	const existing = await findOwnedAddress(userId, id);
	if (!existing) return null;

	const now = new Date();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const set: Record<string, any> = { updatedAt: now };

	set.recipientName = input.recipientName;
	set.line1 = input.line1;
	set.city = input.city;
	set.country = input.country;

	if (input.label !== undefined) set.label = input.label;
	if (input.phone !== undefined) set.phone = input.phone;
	if (input.line2 !== undefined) set.line2 = input.line2;
	if (input.region !== undefined) set.region = input.region;
	if (input.postalCode !== undefined) set.postalCode = input.postalCode;
	if (input.isDefaultShipping !== undefined) set.isDefaultShipping = input.isDefaultShipping;
	if (input.isDefaultBilling !== undefined) set.isDefaultBilling = input.isDefaultBilling;

	await queryDb.transaction(async (tx: any) => {
		if (input.isDefaultShipping) {
			await tx
				.update(t.addresses)
				.set({ isDefaultShipping: false, updatedAt: now })
				.where(
					and(
						eq(t.addresses.userId, userId),
						eq(t.addresses.isDefaultShipping, true),
						ne(t.addresses.id, id)
					)
				);
		}

		if (input.isDefaultBilling) {
			await tx
				.update(t.addresses)
				.set({ isDefaultBilling: false, updatedAt: now })
				.where(
					and(
						eq(t.addresses.userId, userId),
						eq(t.addresses.isDefaultBilling, true),
						ne(t.addresses.id, id)
					)
				);
		}

		await tx
			.update(t.addresses)
			.set(set)
			.where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId)));
	});

	return findOwnedAddress(userId, id);
}

export async function deleteAddress(userId: string, id: string) {
	const existing = await findOwnedAddress(userId, id);
	if (!existing) return false;

	await queryDb
		.delete(t.addresses)
		.where(and(eq(t.addresses.id, id), eq(t.addresses.userId, userId)));

	return true;
}
