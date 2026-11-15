import { api } from '#lib/frontend/modules/shared/http.ts';
import type {
	DataEnvelope,
	OrderDetail,
	OrderSummary,
	PagedEnvelope
} from '#lib/frontend/modules/account/models/index.ts';

export function listOrders(page: number, pageSize: number): Promise<PagedEnvelope<OrderSummary>> {
	return api.get<PagedEnvelope<OrderSummary>>(`/api/orders?page=${page}&pageSize=${pageSize}`);
}

export async function getOrder(orderNumber: string): Promise<OrderDetail> {
	const payload = await api.get<DataEnvelope<OrderDetail>>(
		`/api/orders/${encodeURIComponent(orderNumber)}`
	);
	return payload.data;
}
