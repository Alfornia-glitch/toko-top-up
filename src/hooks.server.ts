import { error, redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { adminScope, isAdminRole, isSuperadminRole } from '#lib/server/modules/admin/access.ts';

const authHandle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	const { auth } = await import('#lib/server/modules/auth/index.ts');

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	const scope = adminScope(event.url.pathname);

	if (scope) {
		const isApi = event.url.pathname.startsWith('/api/');
		const user = event.locals.user;

		if (!user) {
			if (isApi) {
				return Response.json({ error: 'Authentication required' }, { status: 401 });
			}

			const redirectTo = `${event.url.pathname}${event.url.search}`;
			redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
		}

		const allowed = scope === 'super' ? isSuperadminRole(user.role) : isAdminRole(user.role);

		if (!allowed) {
			if (isApi) {
				return Response.json({ error: 'Forbidden' }, { status: 403 });
			}

			error(403, 'Forbidden');
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle = authHandle;

export const handleError: HandleServerError = ({ error, event }) => {
	console.error('[hooks] request failed', { path: event.url.pathname, error });

	if (typeof error === 'object' && error !== null && 'status' in error) {
		const status = (error as { status?: number }).status;

		if (status === 403) return { message: 'Forbidden' };
		if (status === 404) return { message: 'Not found' };
	}

	return { message: 'Internal Error' };
};
