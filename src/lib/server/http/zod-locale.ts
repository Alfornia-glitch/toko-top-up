import { z } from 'zod';

/**
 * Switches zod's built-in issue messages to the request locale. zod's config is process-global,
 * so this runs at the start of every request (parsing is synchronous, which keeps the window for
 * interleaved requests tiny). Validation `details` therefore arrive already translated.
 */
export function applyZodLocale(locale: string): void {
	z.config(locale === 'id' ? z.locales.id() : z.locales.en());
}
