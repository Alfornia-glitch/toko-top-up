import { errorMessage } from '#lib/frontend/i18n/index.ts';
import { api, unwrap } from '../shared/http.ts';
import type { WishlistItem } from '../commerce/models.ts';

class WishlistStore {
	items = $state<WishlistItem[]>([]);
	loading = $state(false);
	error = $state('');
	loaded = $state(false);

	private inflight: Promise<void> | null = null;

	readonly count = $derived(this.items.length);
	readonly ids = $derived(new Set(this.items.map((item) => item.id)));

	isWishlisted(productId: string): boolean {
		return this.ids.has(productId);
	}

	async ensure(): Promise<void> {
		if (this.loaded) return;
		if (this.inflight) return this.inflight;

		this.inflight = this.load();

		try {
			await this.inflight;
		} finally {
			this.inflight = null;
		}
	}

	async load(): Promise<void> {
		this.loading = true;
		this.error = '';

		try {
			const payload = await api.get<{ data: WishlistItem[] }>('/api/wishlist');
			this.items = unwrap(payload);
		} catch (cause) {
			this.error = errorMessage(cause, 'components_wishlist_store_load_failed');
			throw cause;
		} finally {
			this.loading = false;
			this.loaded = true;
		}
	}

	async refresh(): Promise<void> {
		this.inflight = null;
		this.loaded = false;
		await this.load();
	}

	async add(productId: string): Promise<void> {
		await api.post<{ data: unknown }>('/api/wishlist', { productId });
		await this.refresh();
	}

	async remove(productId: string): Promise<void> {
		await api.delete(`/api/wishlist/${encodeURIComponent(productId)}`);
		this.items = this.items.filter((item) => item.id !== productId);
	}

	reset(): void {
		this.items = [];
		this.error = '';
		this.loading = false;
		this.loaded = false;
		this.inflight = null;
	}
}

export const wishlist = new WishlistStore();
