import { describe, expect, it } from 'vitest';
import { setLocale } from '#lib/paraglide/runtime.js';
import { timelineMessage } from '#lib/frontend/i18n/events.ts';

describe('timelineMessage', () => {
	it('translates known server sentences', () => {
		setLocale('id', { reload: false });
		expect(timelineMessage({ type: 'placed', message: 'Order placed' })).toBe('Pesanan dibuat');
		expect(timelineMessage({ message: 'Shipped with JNE (123)' })).toBe('Dikirim dengan JNE (123)');
		setLocale('en', { reload: false });
		expect(timelineMessage({ message: 'Order cancelled: Payment window expired' })).toBe(
			'Order cancelled: payment window expired'
		);
	});

	it('falls back to the stored message and null', () => {
		expect(timelineMessage({ message: 'Customer called us' })).toBe('Customer called us');
		expect(timelineMessage({ message: '  ' })).toBeNull();
		expect(timelineMessage({ message: null })).toBeNull();
	});
});
