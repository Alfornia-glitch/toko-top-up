import { isAppError } from '#shared';
import { MediaError } from '#lib/server/platform/storage/index.ts';

export function apiErrorResponse(error: unknown, context: string): Response {
	if (isAppError(error) || error instanceof MediaError) {
		return Response.json({ error: error.message }, { status: error.status });
	}

	console.error(`[api/admin] ${context} failed`, error);

	return Response.json({ error: 'Unexpected server error' }, { status: 500 });
}
