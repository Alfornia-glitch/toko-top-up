import type { RequestHandler } from './$types';
import {
	MediaError,
	canUploadToFolder,
	normaliseFolder,
	uploadMedia
} from '#lib/server/modules/storage/index.ts';
import { createMediaAsset } from '#lib/server/modules/admin/media.ts';

/**
 * Uploads one image to the configured public storage backend and returns its
 * permanent public URL. Requires a better-auth session (populated by
 * `hooks.server.ts`) and a `multipart/form-data` body with a `file` field plus
 * an optional `folder` field.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.session || !locals.user) {
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

		if (!canUploadToFolder(locals.user.role, folder)) {
			return Response.json(
				{ error: `Uploads to "${folder}" are not allowed for your role` },
				{ status: 403 }
			);
		}

		const media = await uploadMedia(file, folder);
		const id = await createMediaAsset(media, folder, locals.user.id);

		return Response.json({ id, ...media }, { status: 201 });
	} catch (error) {
		if (error instanceof MediaError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error('[api/upload] unexpected failure', error);

		return Response.json({ error: 'Upload failed' }, { status: 500 });
	}
};
