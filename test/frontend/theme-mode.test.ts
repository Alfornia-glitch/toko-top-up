// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { applyThemeMode } from '#lib/frontend/modules/commerce/theme-mode.ts';

function mockSystemDark(initial: boolean) {
	let matches = initial;
	const listeners = new Set<() => void>();
	vi.stubGlobal('matchMedia', () => ({
		get matches() {
			return matches;
		},
		addEventListener: (_: string, listener: () => void) => listeners.add(listener),
		removeEventListener: (_: string, listener: () => void) => listeners.delete(listener)
	}));
	return {
		set(value: boolean) {
			matches = value;
			listeners.forEach((listener) => listener());
		},
		listeners
	};
}

afterEach(() => {
	document.documentElement.className = '';
	document.documentElement.removeAttribute('style');
	vi.unstubAllGlobals();
});

describe('applyThemeMode', () => {
	test('light and dark set the class and colour scheme', () => {
		applyThemeMode('dark');
		expect(document.documentElement.classList.contains('dark')).toBe(true);
		expect(document.documentElement.style.colorScheme).toBe('dark');

		applyThemeMode('light');
		expect(document.documentElement.classList.contains('dark')).toBe(false);
		expect(document.documentElement.style.colorScheme).toBe('light');
	});

	test('system follows the device until cleaned up', () => {
		const system = mockSystemDark(true);

		const cleanup = applyThemeMode('system');
		expect(document.documentElement.classList.contains('dark')).toBe(true);

		system.set(false);
		expect(document.documentElement.classList.contains('dark')).toBe(false);

		cleanup();
		expect(system.listeners.size).toBe(0);
	});
});
