import type { RequestEvent } from '@sveltejs/kit';
import { DEFAULT_THEME, themeToCss, type ThemeMode } from '#shared/theme.ts';

/** Sets `.dark` before first paint; the SPA shell cannot know the scheme until its JS runs. */
function modeScript(mode: ThemeMode): string {
	if (mode === 'light') return '';
	const dark = mode === 'dark' ? 'true' : "matchMedia('(prefers-color-scheme: dark)').matches";
	return `<script>document.documentElement.classList.toggle('dark',${dark})</script>`;
}

/**
 * Head markup that applies the superadmin's theme to the SPA shell without a flash. The CSS is
 * built from sanitized colours only (see `sanitizeTheme`), so it cannot close the tag early.
 */
export async function resolveThemeHead(event: RequestEvent): Promise<string> {
	try {
		const result = await event.locals.services.storefront.storefront.getSiteSettings();
		const theme = result.ok ? result.value.theme : DEFAULT_THEME;
		const css = themeToCss(theme);
		return (css ? `<style id="theme-overrides">${css}</style>` : '') + modeScript(theme.mode);
	} catch {
		return '';
	}
}
