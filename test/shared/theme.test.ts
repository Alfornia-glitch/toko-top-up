import { describe, expect, it } from 'vitest';
import {
	DEFAULT_COLORS,
	DEFAULT_THEME,
	THEME_TOKENS,
	isThemeColor,
	sanitizeTheme,
	themeColor,
	themeToCss
} from '#shared/theme.ts';
import { resolveSiteSettings } from '#modules/storefront/domain/site-settings.ts';

describe('theme', () => {
	it('accepts plain colours only', () => {
		for (const ok of [
			'#fff',
			'#0a0a0a',
			'#0a0a0a80',
			'oklch(0.5 0.2 30)',
			'oklch(1 0 0 / 10%)',
			'rgb(1, 2, 3)'
		]) {
			expect(isThemeColor(ok), ok).toBe(true);
		}
		for (const bad of [
			'red;}</style><script>alert(1)</script>',
			'url(https://evil.test/x.png)',
			'var(--primary)',
			'#ggg',
			'oklch(0 0 0); color: red',
			'',
			42
		]) {
			expect(isThemeColor(bad), String(bad)).toBe(false);
		}
	});

	it('drops unknown tokens, bad colours and bad radius', () => {
		const theme = sanitizeTheme({
			mode: 'neon',
			radius: 'calc(1px)',
			light: { primary: '#123456', nope: '#ffffff', ring: 'javascript:1' },
			dark: 'nope'
		});

		expect(theme).toEqual({
			mode: 'light',
			radius: '0.625rem',
			light: { primary: '#123456' },
			dark: {}
		});
	});

	it('emits CSS only for overrides', () => {
		expect(themeToCss(DEFAULT_THEME)).toBe('');
		expect(
			themeToCss(
				sanitizeTheme({
					radius: '1rem',
					light: { primary: '#123456' },
					dark: { primary: '#abcdef' }
				})
			)
		).toBe(':root{--primary:#123456;--radius:1rem;}.dark{--primary:#abcdef;}');
	});

	it('resolves a token to its override or default', () => {
		const theme = sanitizeTheme({ light: { primary: '#123456' } });
		expect(themeColor(theme, 'light', 'primary')).toBe('#123456');
		expect(themeColor(theme, 'dark', 'primary')).toBe(DEFAULT_COLORS.dark.primary);
	});

	it('defines every token for both schemes', () => {
		for (const { key } of THEME_TOKENS) {
			expect(DEFAULT_COLORS.light[key]).toBeTruthy();
			expect(DEFAULT_COLORS.dark[key]).toBeTruthy();
		}
	});

	it('sanitizes the stored theme setting when settings resolve', () => {
		const settings = resolveSiteSettings([
			{ key: 'theme', valueJson: { light: { primary: '#123456', ring: 'x;}' } } }
		]);
		expect(settings.theme.light).toEqual({ primary: '#123456' });
		expect(resolveSiteSettings([]).theme).toEqual(DEFAULT_THEME);
	});
});
