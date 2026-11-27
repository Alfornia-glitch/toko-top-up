import type { Theme } from './theme.ts';

/** Starting points in the theme editor; a preset only overrides the brand tokens. */
export const THEME_PRESETS = {
	default: { mode: 'light', radius: '0.625rem', light: {}, dark: {} },
	blue: {
		mode: 'light',
		radius: '0.625rem',
		light: {
			primary: 'oklch(0.488 0.243 264.376)',
			'primary-foreground': 'oklch(0.985 0 0)',
			ring: 'oklch(0.623 0.214 259.815)',
			'sidebar-primary': 'oklch(0.488 0.243 264.376)'
		},
		dark: {
			primary: 'oklch(0.707 0.165 254.624)',
			'primary-foreground': 'oklch(0.145 0 0)',
			ring: 'oklch(0.546 0.245 262.881)'
		}
	},
	warm: {
		mode: 'light',
		radius: '0.75rem',
		light: {
			background: 'oklch(0.985 0.006 80)',
			primary: 'oklch(0.646 0.222 41.116)',
			'primary-foreground': 'oklch(0.985 0 0)',
			ring: 'oklch(0.75 0.183 55.934)',
			'sidebar-primary': 'oklch(0.646 0.222 41.116)'
		},
		dark: {
			primary: 'oklch(0.75 0.183 55.934)',
			'primary-foreground': 'oklch(0.145 0 0)',
			ring: 'oklch(0.646 0.222 41.116)'
		}
	}
} as const satisfies Record<string, Theme>;

export type ThemePresetName = keyof typeof THEME_PRESETS;
