import type { RequestHandler } from './$types';
import { MediaError, deleteMedia } from '#lib/server/platform/storage/index.ts';
import { errorBody, unwrap } from '#shared';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const { content } = locals.services.content;
		const asset = unwrap(await content.findMedia(params.id, locals.actor));

		// Remove the stored file first so a failed delete leaves the row for a retry.
		await deleteMedia(asset.path);
		unwrap(await content.deleteMedia(params.id, locals.actor));

		return Response.json({ data: { id: asset.id } });
	} catch (error) {
		if (error instanceof MediaError) {
			return Response.json(errorBody(error), { status: error.status });
		}

		console.error('[api/admin/media] delete failed', error);

		return Response.json(
			{ error: 'Could not delete media asset', code: 'media_delete_failed' },
			{ status: 500 }
		);
	}
};
