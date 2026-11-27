import { THEME_MODES, THEME_PREFERENCE_KEY, type ThemeMode } from '#shared/theme.ts';

function isThemeMode(value: unknown): value is ThemeMode {
	return THEME_MODES.some((mode) => mode === value);
}

function read(): ThemeMode | null {
	try {
		const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
		return isThemeMode(stored) ? stored : null;
	} catch {
		// Storage can be blocked (private mode); the site default still applies.
		return null;
	}
}

function write(mode: ThemeMode) {
	try {
		localStorage.setItem(THEME_PREFERENCE_KEY, mode);
	} catch {
		// Storage can be blocked (private mode); the choice then lasts until reload.
	}
}

/** The visitor's own colour scheme, kept in this browser only. */
class ThemePreference {
	/** `null` until the visitor picks one, so the site default applies. */
	choice = $state<ThemeMode | null>(typeof localStorage === 'undefined' ? null : read());

	constructor() {
		if (typeof window === 'undefined') return;
		// Keeps other tabs in step.
		window.addEventListener('storage', (event) => {
			if (event.key === THEME_PREFERENCE_KEY) this.choice = read();
		});
	}

	effective(siteMode: ThemeMode): ThemeMode {
		return this.choice ?? siteMode;
	}

	set(mode: ThemeMode) {
		this.choice = mode;
		write(mode);
	}
}

export const themePreference = new ThemePreference();
