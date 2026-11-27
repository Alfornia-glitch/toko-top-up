import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { mediaListSchema } from '#lib/server/http/admin-validation.ts';

export const GET: RequestHandler = async ({ url, locals }) => {
	const parsed = mediaListSchema.safeParse(Object.fromEntries(url.searchParams));

	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid query parameters', code: 'invalid_query' },
			{ status: 400 }
		);
	}

	const result = unwrap(await locals.services.content.content.listMedia(parsed.data, locals.actor));

	return Response.json(result);
};
