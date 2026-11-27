// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from 'vitest';
import { THEME_PREFERENCE_KEY } from '#shared/theme.ts';
import { themePreference } from '#lib/frontend/modules/commerce/theme-preference.svelte.ts';
import { modeScript } from '#lib/server/http/theme.ts';

beforeEach(() => {
	localStorage.clear();
	themePreference.choice = null;
});

describe('themePreference', () => {
	test('falls back to the site default until a choice is made', () => {
		expect(themePreference.effective('light')).toBe('light');
		themePreference.set('dark');
		expect(themePreference.effective('light')).toBe('dark');
	});

	test('persists the choice', () => {
		themePreference.set('system');
		expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('system');
	});
});

describe('modeScript', () => {
	function run(site: 'light' | 'dark' | 'system', stored?: string) {
		document.documentElement.className = '';
		if (stored) localStorage.setItem(THEME_PREFERENCE_KEY, stored);
		const body = modeScript(site).replace(/^<script>|<\/script>$/g, '');
		new Function(body)();
		return document.documentElement.classList.contains('dark');
	}

	test('uses the site default without a stored choice', () => {
		expect(run('dark')).toBe(true);
		expect(run('light')).toBe(false);
	});

	test('the stored choice wins, even over a light site', () => {
		expect(run('light', 'dark')).toBe(true);
		localStorage.clear();
		expect(run('dark', 'light')).toBe(false);
	});

	test('ignores an invalid stored value', () => {
		expect(run('dark', 'purple')).toBe(true);
	});
});
