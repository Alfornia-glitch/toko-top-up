import { MediaError } from '#lib/server/modules/storage/index.ts';
import { CatalogError } from './errors.ts';

export function catalogErrorResponse(error: unknown, context: string): Response {
	if (error instanceof CatalogError || error instanceof MediaError) {
		return Response.json({ error: error.message }, { status: error.status });
	}

	console.error(`[api/admin] ${context} failed`, error);

	return Response.json({ error: 'Unexpected server error' }, { status: 500 });
}
