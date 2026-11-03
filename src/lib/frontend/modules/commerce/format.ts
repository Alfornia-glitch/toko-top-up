export function formatMoney(cents: number, currency = 'USD'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency || 'USD'
	}).format(cents / 100);
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
