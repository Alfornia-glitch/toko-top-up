/**
 * The storefront and admin colour system. Every surface reads the CSS variables listed here
 * (declared in `src/routes/layout.css`); a superadmin overrides them from `/admin/super/theme`.
 * Pure and dependency-free so the server, the SPA and tests share one definition.
 */

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** `localStorage` key holding a visitor's own colour scheme, which overrides the site default. */
export const THEME_PREFERENCE_KEY = 'theme-preference';

export const THEME_GROUPS = ['surface', 'text', 'brand', 'status', 'line', 'sidebar'] as const;
export type ThemeGroup = (typeof THEME_GROUPS)[number];

export const THEME_TOKENS = [
	{ key: 'background', group: 'surface', pairedWith: 'foreground' },
	{ key: 'foreground', group: 'text' },
	{ key: 'card', group: 'surface', pairedWith: 'card-foreground' },
	{ key: 'card-foreground', group: 'text' },
	{ key: 'popover', group: 'surface', pairedWith: 'popover-foreground' },
	{ key: 'popover-foreground', group: 'text' },
	{ key: 'muted', group: 'surface', pairedWith: 'muted-foreground' },
	{ key: 'muted-foreground', group: 'text' },
	{ key: 'primary', group: 'brand', pairedWith: 'primary-foreground' },
	{ key: 'primary-foreground', group: 'brand' },
	{ key: 'secondary', group: 'brand', pairedWith: 'secondary-foreground' },
	{ key: 'secondary-foreground', group: 'brand' },
	{ key: 'accent', group: 'brand', pairedWith: 'accent-foreground' },
	{ key: 'accent-foreground', group: 'brand' },
	{ key: 'destructive', group: 'status' },
	{ key: 'success', group: 'status', pairedWith: 'success-foreground' },
	{ key: 'success-foreground', group: 'status' },
	{ key: 'warning', group: 'status', pairedWith: 'warning-foreground' },
	{ key: 'warning-foreground', group: 'status' },
	{ key: 'rating', group: 'status' },
	{ key: 'border', group: 'line' },
	{ key: 'input', group: 'line' },
	{ key: 'ring', group: 'line' },
	{ key: 'sidebar', group: 'sidebar', pairedWith: 'sidebar-foreground' },
	{ key: 'sidebar-foreground', group: 'sidebar' },
	{ key: 'sidebar-primary', group: 'sidebar', pairedWith: 'sidebar-primary-foreground' },
	{ key: 'sidebar-primary-foreground', group: 'sidebar' },
	{ key: 'sidebar-accent', group: 'sidebar', pairedWith: 'sidebar-accent-foreground' },
	{ key: 'sidebar-accent-foreground', group: 'sidebar' },
	{ key: 'sidebar-border', group: 'sidebar' },
	{ key: 'sidebar-ring', group: 'sidebar' }
] as const satisfies ReadonlyArray<{
	key: string;
	group: ThemeGroup;
	/** The text colour that sits on this token; the editor checks their contrast. */
	pairedWith?: string;
}>;

export type ThemeToken = (typeof THEME_TOKENS)[number]['key'];
export type ThemeColors = Partial<Record<ThemeToken, string>>;

export interface Theme {
	/** Colour scheme new visitors get; `system` follows their OS. */
	mode: ThemeMode;
	radius: string;
	light: ThemeColors;
	dark: ThemeColors;
}

export const DEFAULT_RADIUS = '0.625rem';

/** Built-in values; they must match `:root` / `.dark` in `layout.css`. */
export const DEFAULT_COLORS: Record<'light' | 'dark', Record<ThemeToken, string>> = {
	light: {
		background: 'oklch(1 0 0)',
		foreground: 'oklch(0.145 0 0)',
		card: 'oklch(1 0 0)',
		'card-foreground': 'oklch(0.145 0 0)',
		popover: 'oklch(1 0 0)',
		'popover-foreground': 'oklch(0.145 0 0)',
		muted: 'oklch(0.97 0 0)',
		'muted-foreground': 'oklch(0.556 0 0)',
		primary: 'oklch(0.205 0 0)',
		'primary-foreground': 'oklch(0.985 0 0)',
		secondary: 'oklch(0.97 0 0)',
		'secondary-foreground': 'oklch(0.205 0 0)',
		accent: 'oklch(0.97 0 0)',
		'accent-foreground': 'oklch(0.205 0 0)',
		destructive: 'oklch(0.577 0.245 27.325)',
		success: 'oklch(0.627 0.194 149.214)',
		'success-foreground': 'oklch(0.985 0 0)',
		warning: 'oklch(0.666 0.179 58.318)',
		'warning-foreground': 'oklch(0.985 0 0)',
		rating: 'oklch(0.666 0.179 58.318)',
		border: 'oklch(0.922 0 0)',
		input: 'oklch(0.922 0 0)',
		ring: 'oklch(0.708 0 0)',
		sidebar: 'oklch(0.985 0 0)',
		'sidebar-foreground': 'oklch(0.145 0 0)',
		'sidebar-primary': 'oklch(0.205 0 0)',
		'sidebar-primary-foreground': 'oklch(0.985 0 0)',
		'sidebar-accent': 'oklch(0.97 0 0)',
		'sidebar-accent-foreground': 'oklch(0.205 0 0)',
		'sidebar-border': 'oklch(0.922 0 0)',
		'sidebar-ring': 'oklch(0.708 0 0)'
	},
	dark: {
		background: 'oklch(0.145 0 0)',
		foreground: 'oklch(0.985 0 0)',
		card: 'oklch(0.205 0 0)',
		'card-foreground': 'oklch(0.985 0 0)',
		popover: 'oklch(0.205 0 0)',
		'popover-foreground': 'oklch(0.985 0 0)',
		muted: 'oklch(0.269 0 0)',
		'muted-foreground': 'oklch(0.708 0 0)',
		primary: 'oklch(0.922 0 0)',
		'primary-foreground': 'oklch(0.205 0 0)',
		secondary: 'oklch(0.269 0 0)',
		'secondary-foreground': 'oklch(0.985 0 0)',
		accent: 'oklch(0.269 0 0)',
		'accent-foreground': 'oklch(0.985 0 0)',
		destructive: 'oklch(0.704 0.191 22.216)',
		success: 'oklch(0.723 0.219 149.579)',
		'success-foreground': 'oklch(0.145 0 0)',
		warning: 'oklch(0.769 0.188 70.08)',
		'warning-foreground': 'oklch(0.145 0 0)',
		rating: 'oklch(0.769 0.188 70.08)',
		border: 'oklch(1 0 0 / 10%)',
		input: 'oklch(1 0 0 / 15%)',
		ring: 'oklch(0.556 0 0)',
		sidebar: 'oklch(0.205 0 0)',
		'sidebar-foreground': 'oklch(0.985 0 0)',
		'sidebar-primary': 'oklch(0.488 0.243 264.376)',
		'sidebar-primary-foreground': 'oklch(0.985 0 0)',
		'sidebar-accent': 'oklch(0.269 0 0)',
		'sidebar-accent-foreground': 'oklch(0.985 0 0)',
		'sidebar-border': 'oklch(1 0 0 / 10%)',
		'sidebar-ring': 'oklch(0.556 0 0)'
	}
};

export const DEFAULT_THEME: Theme = {
	mode: 'light',
	radius: DEFAULT_RADIUS,
	light: {},
	dark: {}
};

const TOKEN_KEYS: ReadonlySet<string> = new Set(THEME_TOKENS.map((token) => token.key));

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Functional notation with numbers, units and separators only; no nesting, `var()` or `url()`.
const FUNCTION_COLOR = /^(?:oklch|oklab|rgba?|hsla?)\(\s*[0-9a-z.%\s,/+-]{1,60}\)$/i;
const RADIUS = /^\d{1,2}(?:\.\d{1,3})?(?:rem|px)$/;

/** The colours are written into a `<style>` tag, so anything but a plain colour is rejected. */
export function isThemeColor(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const color = value.trim();
	return color.length <= 80 && (HEX_COLOR.test(color) || FUNCTION_COLOR.test(color));
}

export function isThemeToken(key: string): key is ThemeToken {
	return TOKEN_KEYS.has(key);
}

function sanitizeColors(value: unknown): ThemeColors {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

	const colors: ThemeColors = {};
	for (const [key, color] of Object.entries(value)) {
		if (isThemeToken(key) && isThemeColor(color)) colors[key] = color.trim();
	}
	return colors;
}

/** Keeps only known tokens with valid colours; everything else falls back to the defaults. */
export function sanitizeTheme(value: unknown): Theme {
	const source =
		typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

	return {
		mode: THEME_MODES.find((mode) => mode === source.mode) ?? DEFAULT_THEME.mode,
		radius:
			typeof source.radius === 'string' && RADIUS.test(source.radius.trim())
				? source.radius.trim()
				: DEFAULT_RADIUS,
		light: sanitizeColors(source.light),
		dark: sanitizeColors(source.dark)
	};
}

/** The colour a token has under a scheme once overrides are applied. */
export function themeColor(theme: Theme, scheme: 'light' | 'dark', token: ThemeToken): string {
	return theme[scheme][token] ?? DEFAULT_COLORS[scheme][token];
}

function declarations(colors: ThemeColors): string {
	return Object.entries(colors)
		.map(([key, color]) => `--${key}:${color};`)
		.join('');
}

/** CSS custom properties that apply a theme's overrides; empty when nothing differs from the defaults. */
export function themeToCss(theme: Theme): string {
	const root =
		declarations(theme.light) +
		(theme.radius === DEFAULT_RADIUS ? '' : `--radius:${theme.radius};`);
	const dark = declarations(theme.dark);

	return (root ? `:root{${root}}` : '') + (dark ? `.dark{${dark}}` : '');
}
