import type { RequestHandler } from './$types';
import { ValidationError, unwrap } from '#shared';
import { customerErrorResponse, requireUser } from '#lib/server/http/customer-response.ts';
import { proofImageResponse } from '#lib/server/http/proof-response.ts';

const MAX_BYTES = 5 * 1024 * 1024;

/** Multipart upload, field `proof`. The service validates ownership, window, type, size and duplicates. */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const form = await request.formData().catch(() => null);
		const file = form?.get('proof');
		if (!(file instanceof File))
			throw new ValidationError('Attach the proof image in field "proof"');

		// Oversized files are refused before being read into memory.
		const bytes =
			file.size > MAX_BYTES ? new Uint8Array() : new Uint8Array(await file.arrayBuffer());
		const data = unwrap(
			await locals.services.payments.payments.uploadProof(
				params.id,
				{ name: file.name, size: file.size, bytes },
				locals.actor
			)
		);
		return Response.json({ data });
	} catch (error) {
		return customerErrorResponse(error, 'upload proof');
	}
};

/** Authenticated stream of the latest proof. Owner (or admin); never a public URL. */
export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireUser(locals.user);
	if (denied) return denied;

	try {
		const proof = unwrap(
			await locals.services.payments.payments.readProof(params.id, null, locals.actor)
		);
		return proofImageResponse(proof);
	} catch (error) {
		return customerErrorResponse(error, 'read proof');
	}
};
