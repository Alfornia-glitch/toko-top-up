import type { ThemeMode } from '#shared/theme.ts';

/**
 * Applies the superadmin's colour scheme to `<html>` (`.dark` plus `color-scheme`). `system`
 * follows the visitor's device until the returned cleanup runs. It only writes the DOM, so it is
 * safe to call from an `$effect`.
 */
export function applyThemeMode(mode: ThemeMode): () => void {
	const root = document.documentElement;

	const set = (dark: boolean) => {
		root.classList.toggle('dark', dark);
		root.style.colorScheme = dark ? 'dark' : 'light';
	};

	if (mode !== 'system') {
		set(mode === 'dark');
		return () => {};
	}

	const query = window.matchMedia('(prefers-color-scheme: dark)');
	const update = () => set(query.matches);

	update();
	query.addEventListener('change', update);
	return () => query.removeEventListener('change', update);
}
