import { m } from '#lib/paraglide/messages.js';
import { goto } from '$app/navigation';
import { createAuthClient } from 'better-auth/svelte';
import { adminClient } from 'better-auth/client/plugins';
import { wishlist } from '#lib/frontend/modules/account/index.ts';

export const authClient = createAuthClient({ plugins: [adminClient()] });

function knownErrorMessage(code: string): string | undefined {
	switch (code) {
		case 'INVALID_EMAIL_OR_PASSWORD':
			return m.components_auth_invalid_credentials();
		case 'INVALID_EMAIL':
			return m.components_auth_invalid_email();
		case 'INVALID_PASSWORD':
			return m.components_auth_invalid_password();
		case 'PASSWORD_TOO_SHORT':
			return m.components_auth_password_too_short();
		case 'USER_ALREADY_EXISTS':
		case 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL':
			return m.components_auth_user_exists();
		default:
			return undefined;
	}
}

export function safeRedirect(target: string | null | undefined, fallback = '/'): string {
	if (target && target.startsWith('/') && !target.startsWith('//')) {
		return target;
	}

	return fallback;
}

export function authErrorMessage(error: unknown, fallback?: string): string {
	const defaultMessage = fallback ?? m.components_auth_generic_error();
	if (!error) return defaultMessage;

	const code =
		typeof error === 'object' && error !== null && 'error' in error
			? (error as { error?: { code?: string } }).error?.code
			: undefined;

	const known = code ? knownErrorMessage(code) : undefined;
	if (known) return known;

	if (error instanceof Error && error.message) {
		return error.message;
	}

	if (typeof error === 'object' && error !== null && 'message' in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === 'string' && message) return message;
	}

	return defaultMessage;
}

export async function signOutUser(redirectTo = '/login'): Promise<void> {
	await authClient.signOut();
	wishlist.reset();
	await goto(redirectTo, { replaceState: true });
}
