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
