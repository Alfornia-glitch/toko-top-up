import type { RequestHandler } from './$types';
import { MediaError } from '#lib/server/modules/storage/index.ts';
import { deleteMediaAsset } from '#lib/server/modules/admin/media.ts';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const asset = await deleteMediaAsset(params.id);

		if (!asset) {
			return Response.json({ error: 'Media asset not found' }, { status: 404 });
		}

		return Response.json({ data: { id: asset.id } });
	} catch (error) {
		if (error instanceof MediaError) {
			return Response.json({ error: error.message }, { status: error.status });
		}

		console.error('[api/admin/media] delete failed', error);

		return Response.json({ error: 'Could not delete media asset' }, { status: 500 });
	}
};
