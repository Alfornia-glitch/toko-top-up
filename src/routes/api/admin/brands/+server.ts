import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { brandWriteSchema } from '#lib/server/modules/admin/validation.ts';
import { createBrand, listBrands } from '#lib/server/modules/catalog/brands.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	return Response.json({ data: await listBrands() });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	let body: unknown;

	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
	}

	const parsed = brandWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid brand data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const id = await createBrand(parsed.data);
		return Response.json({ data: { id } }, { status: 201 });
	} catch (error) {
		return catalogErrorResponse(error, 'create brand');
	}
};
