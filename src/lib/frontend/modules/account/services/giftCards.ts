import { api } from '#lib/frontend/modules/shared/http.ts';
import type { DataEnvelope, GiftCardSummary } from '#lib/frontend/modules/account/models/index.ts';

export async function listGiftCards(): Promise<GiftCardSummary[]> {
	const payload = await api.get<DataEnvelope<GiftCardSummary[]>>('/api/account/gift-cards');
	return payload.data;
}
