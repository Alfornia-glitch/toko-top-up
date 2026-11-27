import { error, isHttpError, isRedirect, redirect, type RequestEvent } from '@sveltejs/kit';
import { sequence, type Handle, type HandleServerError } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { errorBody, hasPermission, isAppError } from '#shared';
import { actorFromUser, adminPermissionForPath } from '#lib/server/actor.server.ts';
import { answerAppError } from '#lib/server/http/app-error-response.ts';
import {
	isAdminWrite,
	isStorefrontRead,
	purgeStorefrontCache,
	storefrontCacheHeaders
} from '#lib/server/http/cdn-cache.ts';
import { applyZodLocale } from '#lib/server/http/zod-locale.ts';
import { resolvePageSeo } from '#lib/server/http/seo.ts';
import { resolveThemeHead } from '#lib/server/http/theme.ts';
import { getRuntime } from '#lib/server/runtime.server.ts';

/**
 * Resolves the request locale (cookie, then base locale) into AsyncLocalStorage so server-side
 * `m.*` calls use it, and writes it into `<html lang>` of the shell.
 */
const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ locale }) => {
		applyZodLocale(locale);
		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

const requestContextHandle: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	const startedAt = performance.now();
	event.locals.requestId = requestId;

	try {
		const response = answerAppError(await resolve(event), event);
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
	// Prerendered pages are static SPA shells and never touch the database.
	if (building) return resolve(event);
	event.locals.services = getRuntime().services;
	return resolve(event);
};

/**
 * Pages are SPA shells (`ssr = false`), so only API calls and admin routes (guarded and loaded on
 * the server) read the session. Public storefront reads skip the database lookup entirely.
 */
function needsSession(event: RequestEvent): boolean {
	const { pathname } = event.url;
	if (adminPermissionForPath(pathname)) return true;
	if (!pathname.startsWith('/api/')) return false;
	return !(event.request.method === 'GET' && pathname.startsWith('/api/storefront/'));
}

/** Writes title, Open Graph and JSON-LD tags into the shell so crawlers that skip JS see them. */
const seoHandle: Handle = async ({ event, resolve }) => {
	if (!event.route.id || event.url.pathname.startsWith('/api/')) return resolve(event);

	const [seo, themeHead] = await Promise.all([resolvePageSeo(event), resolveThemeHead(event)]);
	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('</head>', `\t${seo.head}\n\t${themeHead}\n\t</head>`)
	});

	if (seo.cacheable) setCacheHeaders(response, 3600);
	return response;
};

function setCacheHeaders(response: Response, seconds: number) {
	if (response.status !== 200 || response.headers.has('set-cookie')) return;
	for (const [name, value] of Object.entries(storefrontCacheHeaders(seconds))) {
		response.headers.set(name, value);
	}
}

/** Lets Netlify's CDN answer public catalog reads, and refreshes it after admin changes. */
const cdnCacheHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	if (isStorefrontRead(event)) setCacheHeaders(response, 300);
	else if (isAdminWrite(event) && response.ok) await purgeStorefrontCache();

	return response;
};

const authHandle: Handle = async ({ event, resolve }) => {
	if (building) return resolve(event);

	if (!needsSession(event)) {
		event.locals.session = null;
		event.locals.user = null;
		return resolve(event);
	}

	const { auth } = await import('#lib/server/platform/auth/index.ts');

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
			return Response.json(
				{ error: 'Authentication required', code: 'UNAUTHORIZED' },
				{ status: 401 }
			);
		}

		const redirectTo = `${event.url.pathname}${event.url.search}`;
		redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	if (!hasPermission(event.locals.actor, permission)) {
		if (isApi) {
			return Response.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
		}

		error(403, 'Forbidden');
	}

	return resolve(event);
};

const composed = sequence(
	paraglideHandle,
	requestContextHandle,
	runtimeHandle,
	cdnCacheHandle,
	seoHandle,
	authHandle,
	actorGuardHandle
);

export const handle: Handle = async (input) => {
	try {
		return await composed(input);
	} catch (cause) {
		if (!isAppError(cause)) throw cause;

		if (input.event.url.pathname.startsWith('/api/')) {
			return Response.json(errorBody(cause), { status: cause.status });
		}

		error(cause.status, cause.message);
	}
};

export const handleError: HandleServerError = ({ error: cause, event }) => {
	if (isAppError(cause)) {
		event.locals.appError = cause;
		// Expected client errors (404, 403, 409, ...) are not worth an error log.
		if (cause.status < 500) return { message: cause.message };
	}

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
