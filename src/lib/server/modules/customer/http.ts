import { CatalogError } from '#lib/server/modules/catalog/errors.ts';

export function requireUser(user: { id: string } | null | undefined): Response | null {
	if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
	return null;
}

export function customerErrorResponse(error: unknown, context: string): Response {
	if (error instanceof CatalogError) {
		return Response.json({ error: error.message }, { status: error.status });
	}
	console.error(`[api/customer] ${context} failed`, error);
	return Response.json({ error: 'Unexpected server error' }, { status: 500 });
}
