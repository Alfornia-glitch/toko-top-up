import { api } from '#lib/frontend/modules/shared/http.ts';
import type {
	DataEnvelope,
	PaymentMethod,
	PaymentMethodInput
} from '#lib/frontend/modules/account/models/index.ts';

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
	const payload = await api.get<DataEnvelope<PaymentMethod[]>>('/api/payment-methods');
	return payload.data;
}

export async function createPaymentMethod(input: PaymentMethodInput): Promise<void> {
	await api.post('/api/payment-methods', input);
}

export async function updatePaymentMethod(
	id: string,
	input: Partial<PaymentMethodInput>
): Promise<void> {
	await api.patch(`/api/payment-methods/${id}`, input);
}

export async function deletePaymentMethod(id: string): Promise<void> {
	await api.delete(`/api/payment-methods/${id}`);
}
