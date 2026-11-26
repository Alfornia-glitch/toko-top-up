import { afterEach, describe, expect, test } from 'vitest';
import { setLocale } from '#lib/paraglide/runtime.js';
import { errorMessage } from '#lib/frontend/i18n/errors.ts';
import { auditActionLabel, enumLabel, statusLabel } from '#lib/frontend/i18n/labels.ts';
import { ORDER_STATUS_LABELS } from '#lib/frontend/content/status.ts';
import { ApiError } from '#lib/frontend/modules/shared/http.ts';
import {
	formatAge,
	formatBytes,
	formatDate,
	formatDuration,
	formatNumber
} from '#lib/frontend/modules/commerce/format.ts';

afterEach(() => {
	setLocale('id', { reload: false });
});

describe('locale-aware formatting', () => {
	test('defaults to Indonesian', () => {
		expect(formatNumber(1234567)).toBe('1.234.567');
		expect(formatBytes(1536)).toBe('1,5 KB');
		expect(formatDuration(90_000_000)).toBe('1h 1j');
		expect(formatDate('2026-01-05T00:00:00Z')).toContain('Jan');
	});

	test('follows the active locale', () => {
		setLocale('en', { reload: false });
		expect(formatNumber(1234567)).toBe('1,234,567');
		expect(formatBytes(1536)).toBe('1.5 KB');
		expect(formatDuration(90_000_000)).toBe('1d 1h');
		const now = new Date('2026-01-02T00:00:00Z');
		expect(formatAge('2026-01-01T22:00:00Z', now)).toBe('2 hours ago');
	});
});

describe('enum labels', () => {
	test('translate known values and humanise unknown ones', () => {
		expect(statusLabel('order', 'shipped')).toBe('Dikirim');
		expect(ORDER_STATUS_LABELS.shipped).toBe('Dikirim');
		expect(auditActionLabel('user.set_role')).toBe('Mengubah peran pengguna');
		expect(enumLabel('order', 'brand_new')).toBe('Brand new');
		setLocale('en', { reload: false });
		expect(statusLabel('order', 'shipped')).toBe('Shipped');
	});
});

describe('errorMessage', () => {
	test('maps codes to translations, then server text, then fallback', () => {
		expect(errorMessage({ error: 'Your cart is empty', code: 'cart_empty' })).toBe(
			'Keranjang Anda kosong.'
		);
		expect(errorMessage(new ApiError('Boom', 409, null, { code: 'CONFLICT' }))).toBe(
			'Terjadi konflik dengan data yang ada.'
		);
		expect(errorMessage({ error: 'Custom server text', code: 'unknown_code' })).toBe(
			'Custom server text'
		);
		expect(errorMessage(null, 'common_try_again_later')).toBe(
			'Terjadi kesalahan. Silakan coba lagi nanti.'
		);
		setLocale('en', { reload: false });
		expect(errorMessage({ code: 'FORBIDDEN' })).toBe('You do not have access to do this.');
	});
});
