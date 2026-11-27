import { errorMessage } from '#lib/frontend/i18n/index.ts';
import { api, unwrap } from '../shared/http.ts';
import { DEFAULT_THEME } from '#shared/theme.ts';
import type { SiteSettings } from './models.ts';

/** Store name until the server answers; the superadmin's value replaces it. */
const DEFAULT_STORE_NAME = 'Shopix';
/** Mirrors the server's limits for the superadmin store identity form. */
export const STORE_NAME_MAX_LENGTH = 80;
export const STORE_LOGO_FOLDER = 'store';

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
	storefrontLayout: 'regular',
	topupAccountForm: [],
	storeName: DEFAULT_STORE_NAME,
	logoUrl: null,
	theme: DEFAULT_THEME
};

const LAYOUT_CACHE_KEY = 'shopix:storefront-layout';
const IDENTITY_CACHE_KEY = 'shopix:store-identity';

interface StoreIdentity {
	storeName: string;
	logoUrl: string | null;
}

/** Last store name and logo seen from the server, so headers do not flash the default name. */
function readCachedIdentity(): StoreIdentity {
	try {
		const parsed = JSON.parse(localStorage.getItem(IDENTITY_CACHE_KEY) ?? 'null');
		if (typeof parsed?.storeName === 'string' && parsed.storeName) {
			return {
				storeName: parsed.storeName,
				logoUrl: typeof parsed.logoUrl === 'string' ? parsed.logoUrl : null
			};
		}
	} catch {
		// Storage can be blocked or hold invalid JSON; the built-in name still applies.
	}
	return { storeName: DEFAULT_STORE_NAME, logoUrl: null };
}

function writeCachedIdentity(identity: StoreIdentity) {
	try {
		localStorage.setItem(IDENTITY_CACHE_KEY, JSON.stringify(identity));
	} catch {
		// Storage can be blocked (private mode); the built-in name still applies.
	}
}

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
	private cachedIdentity = readCachedIdentity();

	readonly contact = $derived(this.settings?.contact ?? DEFAULTS.contact);
	readonly social = $derived(this.settings?.social ?? DEFAULTS.social);
	readonly downloads = $derived(this.settings?.downloads ?? DEFAULTS.downloads);
	readonly shipping = $derived(this.settings?.shipping ?? DEFAULTS.shipping);
	readonly currency = $derived(this.settings?.currency ?? DEFAULTS.currency);
	readonly storefrontLayout = $derived(this.settings?.storefrontLayout ?? this.cachedLayout);
	readonly storeName = $derived(this.settings?.storeName ?? this.cachedIdentity.storeName);
	readonly logoUrl = $derived(this.settings ? this.settings.logoUrl : this.cachedIdentity.logoUrl);
	readonly theme = $derived(this.settings?.theme ?? DEFAULTS.theme);
	readonly accountForm = $derived(this.settings?.topupAccountForm ?? DEFAULTS.topupAccountForm);

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
			writeCachedIdentity({ storeName: this.settings.storeName, logoUrl: this.settings.logoUrl });
		} catch (error) {
			this.error = errorMessage(error, 'components_site_load_failed');
		} finally {
			this.loading = false;
		}
	}
}

export const site = new SiteStore();
