import type { RequestEvent } from '@sveltejs/kit';
import { DEFAULT_THEME, THEME_PREFERENCE_KEY, themeToCss, type ThemeMode } from '#shared/theme.ts';

/**
 * Sets `.dark` before first paint; the SPA shell cannot know the scheme until its JS runs. The
 * visitor's stored choice wins over the site default, so it is emitted even for `light`.
 */
export function modeScript(mode: ThemeMode): string {
	return (
		'<script>(function(){var m=' +
		JSON.stringify(mode) +
		';try{var p=localStorage.getItem(' +
		JSON.stringify(THEME_PREFERENCE_KEY) +
		");if(p==='light'||p==='dark'||p==='system')m=p}catch(e){}" +
		"var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);" +
		"var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'})()</script>"
	);
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
