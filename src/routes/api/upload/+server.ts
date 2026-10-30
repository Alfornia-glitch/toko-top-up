import type { RequestHandler } from './$types';
import { MediaError, normaliseFolder, uploadMedia } from '#lib/server/modules/storage/index.ts';

/**
 * Uploads one image to the public Supabase Storage bucket and returns its
 * permanent public URL. Requires a better-auth session (populated by
 * `hooks.server.ts`) and a `multipart/form-data` body with a `file` field plus
 * an optional `folder` field.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.session) {
		return Response.json({ error: 'Authentication required' }, { status: 401 });
	}

	let form: FormData;

	try {
		form = await request.formData();
	} catch {
		return Response.json({ error: 'Expected a multipart/form-data body' }, { status: 400 });
	}

	const file = form.get('file');

	if (!(file instanceof File)) {
		return Response.json({ error: 'Missing "file" field' }, { status: 400 });
	}

	try {
		const folder = normaliseFolder(form.get('folder'));
		const media = await uploadMedia(file, folder);

		return Response.json(media, { status: 201 });
	} catch (error) {
		if (error instanceof MediaError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error('[api/upload] unexpected failure', error);

		return Response.json({ error: 'Upload failed' }, { status: 500 });
	}
};
