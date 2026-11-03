import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { categoryWriteSchema } from '#lib/server/modules/admin/validation.ts';
import { createCategory, listCategories } from '#lib/server/modules/catalog/categories.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	return Response.json({ data: await listCategories() });
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

	const parsed = categoryWriteSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: 'Invalid category data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	try {
		const id = await createCategory(parsed.data);
		return Response.json({ data: { id } }, { status: 201 });
	} catch (error) {
		return catalogErrorResponse(error, 'create category');
	}
};
