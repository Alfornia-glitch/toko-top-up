import { errorMessage } from '#lib/frontend/i18n/index.ts';
import { api, unwrap } from '../shared/http.ts';
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
	currency: 'IDR',
	storefrontLayout: 'regular'
};

const LAYOUT_CACHE_KEY = 'shopix:storefront-layout';

/** Last layout seen from the server, so repeat visits paint the right header before settings load. */
function readCachedLayout(): 'regular' | 'topup' {
	try {
		return localStorage.getItem(LAYOUT_CACHE_KEY) === 'topup' ? 'topup' : 'regular';
	} catch {
		return 'regular';
	}
}

function writeCachedLayout(layout: 'regular' | 'topup') {
	try {
		localStorage.setItem(LAYOUT_CACHE_KEY, layout);
	} catch {
		// Storage can be blocked (private mode); the default layout still applies.
	}
}

class SiteStore {
	settings = $state<SiteSettings | null>(null);
	loading = $state(false);
	error = $state('');

	private inflight: Promise<void> | null = null;
	private cachedLayout = readCachedLayout();

	readonly contact = $derived(this.settings?.contact ?? DEFAULTS.contact);
	readonly social = $derived(this.settings?.social ?? DEFAULTS.social);
	readonly downloads = $derived(this.settings?.downloads ?? DEFAULTS.downloads);
	readonly shipping = $derived(this.settings?.shipping ?? DEFAULTS.shipping);
	readonly currency = $derived(this.settings?.currency ?? DEFAULTS.currency);
	readonly storefrontLayout = $derived(this.settings?.storefrontLayout ?? this.cachedLayout);

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
			writeCachedLayout(this.settings.storefrontLayout);
		} catch (error) {
			this.error = errorMessage(error, 'components_site_load_failed');
		} finally {
			this.loading = false;
		}
	}
}

export const site = new SiteStore();
