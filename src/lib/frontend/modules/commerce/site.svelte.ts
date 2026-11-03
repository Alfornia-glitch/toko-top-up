import { api, unwrap } from './http.ts';
import type { SiteSettings } from './models.ts';

const DEFAULTS: SiteSettings = {
	contact: {
		address1: 'Shop 009A, Level 4, Block A',
		address2: 'Demo Park, Ottawa',
		phone: '+1-613-598-6981',
		email: 'shopix@gmail.com'
	},
	social: { instagram: '', facebook: '', twitter: '' },
	downloads: { appStore: '', googlePlay: '' },
	shipping: [],
	currency: 'USD'
};

class SiteStore {
	settings = $state<SiteSettings | null>(null);
	loading = $state(false);
	error = $state('');

	private inflight: Promise<void> | null = null;

	readonly contact = $derived(this.settings?.contact ?? DEFAULTS.contact);
	readonly social = $derived(this.settings?.social ?? DEFAULTS.social);
	readonly downloads = $derived(this.settings?.downloads ?? DEFAULTS.downloads);
	readonly shipping = $derived(this.settings?.shipping ?? DEFAULTS.shipping);
	readonly currency = $derived(this.settings?.currency ?? DEFAULTS.currency);

	async ensure(): Promise<void> {
		if (this.settings) return;
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
			const payload = await api.get<{ data: SiteSettings }>('/api/storefront/site');
			this.settings = unwrap(payload);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Could not load site settings';
		} finally {
			this.loading = false;
		}
	}
}

export const site = new SiteStore();
