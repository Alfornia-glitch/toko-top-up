import { errorBody, type AppError } from '#shared';

interface ErrorAwareEvent {
	url: URL;
	locals: { appError?: AppError | undefined; requestId: string };
}

/**
 * SvelteKit turns an exception thrown by an endpoint into a 500 before it
 * reaches the `handle` hook. Routes `unwrap` service results, so the exception
 * is often an `AppError` (404, 403, 409, ...). When `handleError` recorded one
 * and the response is that 500, answer with the error's own status in the
 * `{ error }` shape the frontend reads. Any other response is returned as is.
 */
export function answerAppError(response: Response, event: ErrorAwareEvent): Response {
	const thrown = event.locals.appError;
	if (!thrown || response.status !== 500 || !event.url.pathname.startsWith('/api/')) {
		return response;
	}

	return Response.json(errorBody(thrown), {
		status: thrown.status,
		headers: { 'x-request-id': event.locals.requestId }
	});
}
