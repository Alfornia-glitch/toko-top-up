export interface SiteShippingMethod {
	id: string;
	label: string;
	description: string;
	priceCents: number;
	minDays: number;
	maxDays: number;
}

export interface SiteSettings {
	contact: { address1: string; address2: string; phone: string; email: string };
	social: { instagram: string; facebook: string; twitter: string };
	downloads: { appStore: string; googlePlay: string };
	shipping: SiteShippingMethod[];
	currency: string;
}

const defaultSettings: SiteSettings = {
	contact: {
		address1: 'Shop 009A, Level 4, Block A',
		address2: 'Demo Park, Ottawa',
		phone: '+1-613-598-6981',
		email: 'shopix@gmail.com'
	},
	social: { instagram: '', facebook: '', twitter: '' },
	downloads: { appStore: '', googlePlay: '' },
	shipping: [
		{
			id: 'standard',
			label: 'Standard',
			description: 'Get your product in 1 week',
			priceCents: 0,
			minDays: 5,
			maxDays: 7
		},
		{
			id: 'express',
			label: 'Express',
			description: 'Get your product in 0-1 days',
			priceCents: 2000,
			minDays: 0,
			maxDays: 1
		},
		{
			id: 'basic',
			label: 'Basic',
			description: 'Get your product in 3-4 days',
			priceCents: 1000,
			minDays: 3,
			maxDays: 4
		}
	],
	currency: 'IDR'
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeRecord<T extends Record<string, unknown>>(base: T, value: unknown): T {
	if (!isRecord(value)) return { ...base };
	return { ...base, ...value };
}

/** Layers stored site settings over the built-in defaults. */
export function resolveSiteSettings(
	rows: Array<{ key: string; valueJson: unknown }>
): SiteSettings {
	const settings: SiteSettings = {
		contact: { ...defaultSettings.contact },
		social: { ...defaultSettings.social },
		downloads: { ...defaultSettings.downloads },
		shipping: defaultSettings.shipping.map((method) => ({ ...method })),
		currency: defaultSettings.currency
	};

	for (const row of rows) {
		const key = String(row.key);
		const value = row.valueJson;

		switch (key) {
			case 'contact':
				settings.contact = mergeRecord(settings.contact, value);
				break;
			case 'social':
				settings.social = mergeRecord(settings.social, value);
				break;
			case 'downloads':
				settings.downloads = mergeRecord(settings.downloads, value);
				break;
			case 'shipping':
				if (Array.isArray(value)) settings.shipping = value as SiteShippingMethod[];
				break;
			case 'currency':
				if (typeof value === 'string') settings.currency = value;
				break;
		}
	}

	return settings;
}
