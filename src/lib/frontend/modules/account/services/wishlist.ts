import { api } from '#lib/frontend/modules/shared/http.ts';
import type { DataEnvelope, WishlistItem } from '#lib/frontend/modules/account/models/index.ts';

export async function listWishlist(): Promise<WishlistItem[]> {
	const payload = await api.get<DataEnvelope<WishlistItem[]>>('/api/wishlist');
	return payload.data;
}
