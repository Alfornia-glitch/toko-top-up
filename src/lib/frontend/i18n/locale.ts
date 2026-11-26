import { getLocale, locales, setLocale, type Locale } from '#lib/paraglide/runtime.js';

const browser = typeof document !== 'undefined';

export type AppLocale = Locale;
export const APP_LOCALES: readonly AppLocale[] = locales;

const INTL_LOCALES: Record<AppLocale, string> = {
	id: 'id-ID',
	en: 'en-US'
};

/** Active app locale: `'id'` (default) or `'en'`. Reads the cookie in the browser. */
export function currentLocale(): AppLocale {
	return getLocale();
}

/** BCP 47 tag for `Intl.*` (`'id-ID'` / `'en-US'`). Use this instead of hard-coding a locale. */
export function intlLocale(locale: AppLocale = currentLocale()): string {
	return INTL_LOCALES[locale];
}

/** Keeps `<html lang>` in sync; the prerendered shell is always Indonesian. */
export function syncDocumentLang(): void {
	if (browser) document.documentElement.lang = currentLocale();
}

/**
 * Persists the choice in the `PARAGLIDE_LOCALE` cookie and reloads, so every `m.*` call and
 * formatter re-evaluates with the new locale.
 */
export function switchLocale(locale: AppLocale): void {
	if (!browser || locale === currentLocale()) return;
	void setLocale(locale);
}
