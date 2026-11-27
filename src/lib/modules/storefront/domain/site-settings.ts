import { DEFAULT_THEME, sanitizeTheme, type Theme } from '#shared/theme.ts';

export interface SiteShippingMethod {
	id: string;
	label: string;
	description: string;
	price: number;
	minDays: number;
	maxDays: number;
}

export const STOREFRONT_LAYOUTS = ['regular', 'topup'] as const;
export type StorefrontLayout = (typeof STOREFRONT_LAYOUTS)[number];

export const ACCOUNT_FIELD_TYPES = [
	'text',
	'number',
	'email',
	'tel',
	'select',
	'textarea'
] as const;
export type AccountFieldType = (typeof ACCOUNT_FIELD_TYPES)[number];

/** One input on the top-up checkout's account details form (configured by admins). */
export interface AccountFormField {
	id: string;
	label: string;
	type: AccountFieldType;
	required: boolean;
	placeholder: string;
	helpText: string;
	/** Choices for `select` fields; empty otherwise. */
	options: string[];
}

export const ACCOUNT_FORM_MAX_FIELDS = 20;

/** Store name used until a superadmin sets one. */
export const DEFAULT_STORE_NAME = 'Shopix';
export const STORE_NAME_MAX_LENGTH = 80;
/** Logo files are stored in the `store` media folder; the server checks these on save. */
export const STORE_LOGO_FOLDER = 'store';
export const STORE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const STORE_LOGO_TYPES = [
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/avif',
	'image/gif'
] as const;

export interface SiteSettings {
	contact: { address1: string; address2: string; phone: string; email: string };
	social: { instagram: string; facebook: string; twitter: string };
	downloads: { appStore: string; googlePlay: string };
	shipping: SiteShippingMethod[];
	currency: string;
	storefrontLayout: StorefrontLayout;
	/** Account details form the top-up layout asks for between cart and payment. */
	topupAccountForm: AccountFormField[];
	/** Shown in headers, footers, page titles and the admin console. */
	storeName: string;
	/** Public URL of the logo image; null means the built-in mark is shown. */
	logoUrl: string | null;
	/** Colour overrides for the whole site, edited by superadmins at `/admin/super/theme`. */
	theme: Theme;
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
			price: 0,
			minDays: 5,
			maxDays: 7
		},
		{
			id: 'express',
			label: 'Express',
			description: 'Get your product in 0-1 days',
			price: 2000,
			minDays: 0,
			maxDays: 1
		},
		{
			id: 'basic',
			label: 'Basic',
			description: 'Get your product in 3-4 days',
			price: 1000,
			minDays: 3,
			maxDays: 4
		}
	],
	currency: 'IDR',
	storefrontLayout: 'regular',
	topupAccountForm: [
		{
			id: 'user_id',
			label: 'User ID',
			type: 'text',
			required: true,
			placeholder: '',
			helpText: '',
			options: []
		},
		{
			id: 'zone_id',
			label: 'Zone ID',
			type: 'text',
			required: false,
			placeholder: '',
			helpText: '',
			options: []
		}
	],
	storeName: DEFAULT_STORE_NAME,
	logoUrl: null,
	theme: DEFAULT_THEME
};

function isStorefrontLayout(value: unknown): value is StorefrontLayout {
	return STOREFRONT_LAYOUTS.some((layout) => layout === value);
}

/** Accepts a non-empty trimmed name up to the length limit; anything else keeps the default. */
export function sanitizeStoreName(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const name = value.trim().slice(0, STORE_NAME_MAX_LENGTH);
	return name || null;
}

/**
 * Accepts only absolute http(s) URLs, so the logo can never carry a `javascript:` URL. An empty
 * string (how a removed logo is stored, since the settings column cannot hold JSON null) reads as null.
 */
export function sanitizeLogoUrl(value: unknown): string | null | undefined {
	if (value === null) return null;
	if (typeof value !== 'string') return undefined;
	if (value.trim() === '') return null;
	try {
		const url = new URL(value.trim());
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
	} catch {
		return undefined;
	}
}

function isAccountFieldType(value: unknown): value is AccountFieldType {
	return ACCOUNT_FIELD_TYPES.some((type) => type === value);
}

function text(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** Turns a label into a stable field id (`User ID` -> `user_id`). */
export function accountFieldId(label: string): string {
	return label
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 40);
}

/**
 * Keeps only well-formed account form fields: a label is required, ids are
 * unique `[a-z0-9_]` slugs (derived from the label when missing), and a
 * `select` without options falls back to `text`.
 */
export function sanitizeAccountForm(value: unknown): AccountFormField[] {
	if (!Array.isArray(value)) return [];

	const fields: AccountFormField[] = [];
	const seen = new Set<string>();

	for (const entry of value) {
		if (!isRecord(entry) || fields.length >= ACCOUNT_FORM_MAX_FIELDS) continue;

		const label = text(entry.label, 80);
		if (!label) continue;

		const rawId = text(entry.id, 40);
		const id = /^[a-z0-9_]+$/.test(rawId) ? rawId : accountFieldId(rawId || label);
		if (!id || seen.has(id)) continue;

		const options = Array.isArray(entry.options)
			? [...new Set(entry.options.map((option) => text(option, 80)).filter(Boolean))].slice(0, 50)
			: [];
		let type: AccountFieldType = isAccountFieldType(entry.type) ? entry.type : 'text';
		if (type === 'select' && options.length === 0) type = 'text';

		seen.add(id);
		fields.push({
			id,
			label,
			type,
			required: entry.required === true,
			placeholder: text(entry.placeholder, 120),
			helpText: text(entry.helpText, 200),
			options: type === 'select' ? options : []
		});
	}

	return fields;
}

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
		currency: defaultSettings.currency,
		storefrontLayout: defaultSettings.storefrontLayout,
		topupAccountForm: defaultSettings.topupAccountForm.map((field) => ({
			...field,
			options: [...field.options]
		})),
		storeName: defaultSettings.storeName,
		logoUrl: defaultSettings.logoUrl,
		theme: defaultSettings.theme
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
			case 'storefrontLayout':
				if (isStorefrontLayout(value)) settings.storefrontLayout = value;
				break;
			case 'topupAccountForm':
				if (Array.isArray(value)) settings.topupAccountForm = sanitizeAccountForm(value);
				break;
			case 'storeName': {
				const name = sanitizeStoreName(value);
				if (name) settings.storeName = name;
				break;
			}
			case 'logoUrl': {
				const logo = sanitizeLogoUrl(value);
				if (logo !== undefined) settings.logoUrl = logo;
				break;
			}
			case 'theme':
				settings.theme = sanitizeTheme(value);
				break;
		}
	}

	return settings;
}
