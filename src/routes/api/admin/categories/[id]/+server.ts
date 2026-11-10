import type { RequestHandler } from './$types';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { categoryWriteSchema } from '#modules/catalog/index.ts';
import { categoryService } from '../category-service.ts';

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

	const result = await categoryService.update(params.id, parsed.data);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: { id: result.value.id } });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;

	const result = await categoryService.delete(params.id);
	if (!result.ok) {
		return Response.json({ error: result.error.message }, { status: result.error.status });
	}

	return Response.json({ data: { id: params.id } });
};
