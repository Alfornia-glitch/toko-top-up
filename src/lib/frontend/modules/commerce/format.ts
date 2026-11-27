import { m } from '#lib/paraglide/messages.js';
import { intlLocale } from '#lib/frontend/i18n/locale.ts';

/** Money is stored and displayed in whole rupiah. Never scale by 100. */
export function formatMoney(amount: number, currency = 'IDR'): string {
	const code = currency || 'IDR';
	return new Intl.NumberFormat(code === 'IDR' ? 'id-ID' : 'en-US', {
		style: 'currency',
		currency: code,
		maximumFractionDigits: 0
	}).format(amount);
}

export function ratingValue(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.min(5, value > 5 ? value / 100 : value);
}

export function discountPercent(price: number, compareAt: number | null): number {
	if (!compareAt || compareAt <= price) return 0;
	return Math.round(((compareAt - price) / compareAt) * 100);
}

function toDate(value: string | Date | number | null | undefined): Date | null {
	if (value === null || value === undefined || value === '') return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/** Date in the current locale, e.g. `26 Nov 2026` (id) / `Nov 26, 2026` (en). Empty for bad input. */
export function formatDate(value: string | Date | null | undefined): string {
	const date = toDate(value);
	if (!date) return '';
	return new Intl.DateTimeFormat(intlLocale(), {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
	const date = toDate(value);
	if (!date) return '';
	return new Intl.DateTimeFormat(intlLocale(), {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}

/** Plain number with the locale's grouping (`1.234` in Indonesian, `1,234` in English). */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
	return new Intl.NumberFormat(intlLocale(), options).format(value);
}

/** Percentage from a 0-1 ratio, e.g. `0.256` -> `25,6%`. */
export function formatPercent(ratio: number, fractionDigits = 0): string {
	return formatNumber(ratio, {
		style: 'percent',
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits
	});
}

/** File size with translated units: `B`, `KB`, `MB`, `GB` (1024 based). */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return '';
	if (bytes < 1024) return `${formatNumber(bytes)} ${m.common_unit_byte()}`;
	const units = [m.common_unit_kb(), m.common_unit_mb(), m.common_unit_gb()];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${formatNumber(value, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

/**
 * Compact duration from milliseconds, largest two units: `2d 3h`, `5h 10m`, `45s`
 * (Indonesian: `2h 3j`, `5j 10m`, `45d`). Zero and negative input give `0` seconds.
 */
export function formatDuration(milliseconds: number): string {
	const total = Number.isFinite(milliseconds) ? Math.max(0, Math.floor(milliseconds / 1000)) : 0;
	const days = Math.floor(total / 86_400);
	const hours = Math.floor((total % 86_400) / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const seconds = total % 60;
	const parts: string[] = [];
	if (days) parts.push(m.common_duration_days({ count: days }));
	if (hours) parts.push(m.common_duration_hours({ count: hours }));
	if (minutes && parts.length < 2) parts.push(m.common_duration_minutes({ count: minutes }));
	if ((seconds || parts.length === 0) && parts.length < 2 && !days && !hours) {
		parts.push(m.common_duration_seconds({ count: seconds }));
	}
	return parts.slice(0, 2).join(' ');
}

/** Relative age such as `Just now`, `5 minutes ago`, `3 days ago`; older than 30 days shows the date. */
export function formatAge(value: string | Date | null | undefined, now: Date = new Date()): string {
	const date = toDate(value);
	if (!date) return '';
	const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
	if (seconds < 60) return m.common_age_just_now();
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return m.common_age_minutes_ago({ count: minutes });
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return m.common_age_hours_ago({ count: hours });
	const days = Math.floor(hours / 24);
	if (days <= 30) return m.common_age_days_ago({ count: days });
	return formatDate(date);
}
