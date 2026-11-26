import { errorBody, isAppError } from '#shared';
import { MediaError } from '#lib/server/platform/storage/index.ts';

export function apiErrorResponse(error: unknown, context: string): Response {
	if (isAppError(error) || error instanceof MediaError) {
		return Response.json(errorBody(error), { status: error.status });
	}

	console.error(`[api/admin] ${context} failed`, error);

	return Response.json(
		{ error: 'Unexpected server error', code: 'UNEXPECTED_ERROR' },
		{ status: 500 }
	);
}
