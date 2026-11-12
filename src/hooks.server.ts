import { error, isHttpError, isRedirect, redirect } from '@sveltejs/kit';
import { sequence, type Handle, type HandleServerError } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { hasPermission, isAppError } from '#shared';
import { actorFromUser, adminPermissionForPath } from '#lib/server/actor.server.ts';
import { getRuntime } from '#lib/server/runtime.server.ts';

const requestContextHandle: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	const startedAt = performance.now();
	event.locals.requestId = requestId;

	try {
		const response = await resolve(event);
		response.headers.set('x-request-id', requestId);
		console.info(
			JSON.stringify({
				requestId,
				method: event.request.method,
				path: event.url.pathname,
				status: response.status,
				durationMs: Math.round(performance.now() - startedAt)
			})
		);
		return response;
	} catch (cause) {
		const status = isAppError(cause)
			? cause.status
			: isHttpError(cause)
				? cause.status
				: isRedirect(cause)
					? cause.status
					: 500;
		const log = isRedirect(cause) ? console.info : console.error;

		log(
			JSON.stringify({
				requestId,
				method: event.request.method,
				path: event.url.pathname,
				status,
				durationMs: Math.round(performance.now() - startedAt),
				error: cause instanceof Error ? cause.message : String(cause)
			})
		);
		throw cause;
	}
};

const runtimeHandle: Handle = ({ event, resolve }) => {
	event.locals.services = getRuntime().services;
	return resolve(event);
};

const authHandle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	const { auth } = await import('#lib/server/modules/auth/index.ts');

	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return svelteKitHandler({ event, resolve, auth, building });
};

const actorGuardHandle: Handle = ({ event, resolve }) => {
	event.locals.actor = actorFromUser(event.locals.user);

	const permission = adminPermissionForPath(event.url.pathname);
	if (!permission) return resolve(event);

	const isApi = event.url.pathname.startsWith('/api/');

	if (!event.locals.actor) {
		if (isApi) {
			return Response.json({ error: 'Authentication required' }, { status: 401 });
		}

		const redirectTo = `${event.url.pathname}${event.url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (!hasPermission(event.locals.actor, permission)) {
		if (isApi) {
			return Response.json({ error: 'Forbidden' }, { status: 403 });
		}

		error(403, 'Forbidden');
	}

	return resolve(event);
};

const composed = sequence(requestContextHandle, runtimeHandle, authHandle, actorGuardHandle);

export const handle: Handle = async (input) => {
	try {
		return await composed(input);
	} catch (cause) {
		if (!isAppError(cause)) throw cause;

		if (input.event.url.pathname.startsWith('/api/')) {
			return Response.json({ error: cause.message }, { status: cause.status });
		}

		error(cause.status, cause.message);
	}
};

export const handleError: HandleServerError = ({ error: cause, event }) => {
	console.error('[hooks] request failed', {
		requestId: event.locals.requestId,
		path: event.url.pathname,
		error: cause
	});

	if (typeof cause === 'object' && cause !== null && 'status' in cause) {
		const status = (cause as { status?: number }).status;

		if (status === 403) return { message: 'Forbidden' };
		if (status === 404) return { message: 'Not found' };
	}

	return { message: 'Internal Error' };
};
