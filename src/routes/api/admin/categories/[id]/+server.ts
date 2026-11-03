import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { categoryWriteSchema } from '#lib/server/modules/admin/validation.ts';
import { deleteCategory, updateCategory } from '#lib/server/modules/catalog/categories.ts';
import { catalogErrorResponse } from '#lib/server/modules/catalog/http.ts';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
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
		const updated = await updateCategory(params.id, parsed.data);
		if (!updated) return Response.json({ error: 'Category not found' }, { status: 404 });

		return Response.json({ data: { id: params.id } });
	} catch (error) {
		return catalogErrorResponse(error, 'update category');
	}
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const result = await deleteCategory(params.id);

	if (result === 'not_found') {
		return Response.json({ error: 'Category not found' }, { status: 404 });
	}

	if (result === 'in_use') {
		return Response.json(
			{ error: 'Move or delete child categories and products first' },
			{ status: 409 }
		);
	}

	return Response.json({ data: { id: params.id } });
};
