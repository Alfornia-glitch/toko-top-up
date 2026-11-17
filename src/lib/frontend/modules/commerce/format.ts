/** Currencies whose amounts are stored as whole units, not hundredths. */
const ZERO_DECIMAL = new Set(['IDR', 'JPY', 'KRW', 'VND']);

export function formatMoney(cents: number, currency = 'IDR'): string {
	const code = currency || 'IDR';
	const zero = ZERO_DECIMAL.has(code);
	return new Intl.NumberFormat(code === 'IDR' ? 'id-ID' : 'en-US', {
		style: 'currency',
		currency: code,
		maximumFractionDigits: zero ? 0 : 2
	}).format(zero ? cents : cents / 100);
}

export function ratingValue(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.min(5, value > 5 ? value / 100 : value);
}

export function discountPercent(priceCents: number, compareAtCents: number | null): number {
	if (!compareAtCents || compareAtCents <= priceCents) return 0;
	return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}

export function formatDate(value: string | Date | null | undefined): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat('en-US', {
		day: '2-digit',
		month: 'short',
		year: 'numeric'
	}).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat('en-US', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(date);
}
