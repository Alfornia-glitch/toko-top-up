import { api, unwrap } from './http.ts';
import type { Banner, HomeData } from './models.ts';

class HomeStore {
	data = $state<HomeData | null>(null);
	loading = $state(false);
	error = $state('');

	private inflight: Promise<void> | null = null;

	readonly banners = $derived(this.data?.banners ?? []);
	readonly announcements = $derived(this.data?.announcements ?? []);
	readonly testimonials = $derived(this.data?.testimonials ?? []);
	readonly categories = $derived(this.data?.categories ?? []);
	readonly brands = $derived(this.data?.brands ?? []);
	readonly deals = $derived(this.data?.deals ?? []);
	readonly newArrivals = $derived(this.data?.newArrivals ?? []);
	readonly featured = $derived(this.data?.featured ?? []);
	readonly popular = $derived(this.data?.popular ?? []);

	banner(key: Banner['key']): Banner | undefined {
		return this.banners.find((banner) => banner.key === key);
	}

	async ensure(): Promise<void> {
		if (this.data) return;
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
			const payload = await api.get<{ data: HomeData }>('/api/storefront/home');
			this.data = unwrap(payload);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Could not load storefront';
		} finally {
			this.loading = false;
		}
	}
}

export const home = new HomeStore();
