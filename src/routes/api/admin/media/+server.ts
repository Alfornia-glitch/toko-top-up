import type { RequestHandler } from './$types';
import { listMedia } from '#lib/server/modules/admin/media.ts';
import { mediaListSchema } from '#lib/server/modules/admin/validation.ts';

export const GET: RequestHandler = async ({ url }) => {
	const parsed = mediaListSchema.safeParse(Object.fromEntries(url.searchParams));

	if (!parsed.success) {
		return Response.json({ error: 'Invalid query parameters' }, { status: 400 });
	}

	const result = await listMedia(parsed.data);

	return Response.json(result);
};
