import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { requireAdmin } from '#lib/server/http/access.ts';
import { apiErrorResponse } from '#lib/server/http/api-error.ts';
import { proofImageResponse } from '#lib/server/http/proof-response.ts';

/** Authenticated stream (admin only) of a proof image; `?proofId=` selects an older upload. */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	try {
		const proof = unwrap(
			await locals.services.payments.payments.readProof(
				params.id,
				url.searchParams.get('proofId'),
				locals.actor
			)
		);
		return proofImageResponse(proof);
	} catch (error) {
		return apiErrorResponse(error, 'read proof');
	}
};
