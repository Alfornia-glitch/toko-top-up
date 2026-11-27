import type { RequestHandler } from './$types';
import { unwrap } from '#shared';
import { isContentKind, type ContentKind } from '#modules/content/index.ts';
import { requireAdmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import {
	announcementWriteSchema,
	bannerWriteSchema,
	testimonialWriteSchema
} from '#lib/server/http/admin-validation.ts';

function kindOf(value: string): ContentKind | null {
	return isContentKind(value) ? value : null;
}

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	const kind = kindOf(event.params.kind);
	if (!kind)
		return Response.json(
			{ error: 'Unknown content type', code: 'content_kind_unknown' },
			{ status: 404 }
		);
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}
	const schema =
		kind === 'banners'
			? bannerWriteSchema
			: kind === 'announcements'
				? announcementWriteSchema
				: testimonialWriteSchema;
	const parsed = schema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Invalid content data', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
			{ status: 422 }
		);
	const row = unwrap(
		await event.locals.services.content.content.updateItem(
			kind,
			event.params.id,
			parsed.data as Record<string, unknown>,
			event.locals.actor
		)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: `${kind}.update`,
		entityType: kind,
		entityId: event.params.id,
		after: parsed.data
	});
	return Response.json({ data: row });
};

export const DELETE: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	const kind = kindOf(event.params.kind);
	if (!kind)
		return Response.json(
			{ error: 'Unknown content type', code: 'content_kind_unknown' },
			{ status: 404 }
		);
	unwrap(
		await event.locals.services.content.content.deleteItem(
			kind,
			event.params.id,
			event.locals.actor
		)
	);
	await auditRequest(event, event.locals.user!.id, {
		action: `${kind}.delete`,
		entityType: kind,
		entityId: event.params.id
	});
	return Response.json({ data: { id: event.params.id } });
};
