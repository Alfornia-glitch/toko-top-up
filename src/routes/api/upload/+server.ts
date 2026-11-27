import type { RequestHandler } from './$types';
import {
	MediaError,
	canUploadToFolder,
	normaliseFolder,
	uploadMedia
} from '#lib/server/platform/storage/index.ts';
import { errorBody, isAppError, unwrap } from '#shared';

/**
 * Uploads one image to the configured public storage backend and returns its
 * permanent public URL. Requires a better-auth session (populated by
 * `hooks.server.ts`) and a `multipart/form-data` body with a `file` field plus
 * an optional `folder` field.
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.session || !locals.user) {
		return Response.json(
			{ error: 'Authentication required', code: 'UNAUTHORIZED' },
			{ status: 401 }
		);
	}

	let form: FormData;

	try {
		form = await request.formData();
	} catch {
		return Response.json(
			{ error: 'Expected a multipart/form-data body', code: 'invalid_multipart_body' },
			{ status: 400 }
		);
	}

	const file = form.get('file');

	if (!(file instanceof File)) {
		return Response.json(
			{ error: 'Missing "file" field', code: 'upload_file_missing' },
			{ status: 400 }
		);
	}

	try {
		const folder = normaliseFolder(form.get('folder'));

		if (!canUploadToFolder(locals.user.role, folder)) {
			return Response.json(
				{
					error: `Uploads to "${folder}" are not allowed for your role`,
					code: 'upload_folder_forbidden',
					params: { folder }
				},
				{ status: 403 }
			);
		}

		const media = await uploadMedia(file, folder);
		const id = unwrap(
			await locals.services.content.content.recordMedia(
				{
					path: media.path,
					url: media.url,
					contentType: media.contentType,
					sizeBytes: media.size,
					folder,
					uploadedBy: locals.user.id
				},
				locals.actor
			)
		);

		return Response.json({ id, ...media }, { status: 201 });
	} catch (error) {
		if (error instanceof MediaError) {
			return Response.json(errorBody(error), { status: error.status });
		}

		if (isAppError(error)) {
			return Response.json(errorBody(error), { status: error.status });
		}

		console.error('[api/upload] unexpected failure', error);

		return Response.json({ error: 'Upload failed', code: 'upload_failed' }, { status: 500 });
	}
};
