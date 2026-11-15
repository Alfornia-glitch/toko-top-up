import { api } from '#lib/frontend/modules/shared/http.ts';
import type {
	Address,
	AddressInput,
	DataEnvelope
} from '#lib/frontend/modules/account/models/index.ts';

export async function listAddresses(): Promise<Address[]> {
	const payload = await api.get<DataEnvelope<Address[]>>('/api/addresses');
	return payload.data;
}

export async function createAddress(input: AddressInput): Promise<void> {
	await api.post('/api/addresses', input);
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<void> {
	await api.patch(`/api/addresses/${id}`, input);
}

export async function deleteAddress(id: string): Promise<void> {
	await api.delete(`/api/addresses/${id}`);
}
