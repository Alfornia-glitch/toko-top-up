import type { RequestHandler } from './$types';
import type { ContentKind } from '#lib/server/modules/content/site-content.ts';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import {
	announcementWriteSchema,
	bannerWriteSchema,
	testimonialWriteSchema
} from '#lib/server/modules/admin/validation.ts';
import { deleteContent, updateContent } from '#lib/server/modules/content/site-content.ts';

const KINDS: ContentKind[] = ['banners', 'announcements', 'testimonials'];

function kindOf(value: string): ContentKind | null {
	return KINDS.includes(value as ContentKind) ? (value as ContentKind) : null;
}

export const PATCH: RequestHandler = async (event) => {
	const denied = requireAdmin(event.locals.user);
	if (denied) return denied;
	const kind = kindOf(event.params.kind);
	if (!kind) return Response.json({ error: 'Unknown content type' }, { status: 404 });
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json({ error: 'Expected a JSON body' }, { status: 400 });
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
			{ error: 'Invalid content data', details: parsed.error.flatten() },
			{ status: 422 }
		);
	const row = await updateContent(kind, event.params.id, parsed.data as Record<string, unknown>);
	if (!row) return Response.json({ error: 'Content not found' }, { status: 404 });
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
	if (!kind) return Response.json({ error: 'Unknown content type' }, { status: 404 });
	const deleted = await deleteContent(kind, event.params.id);
	if (!deleted) return Response.json({ error: 'Content not found' }, { status: 404 });
	await auditRequest(event, event.locals.user!.id, {
		action: `${kind}.delete`,
		entityType: kind,
		entityId: event.params.id
	});
	return Response.json({ data: { id: event.params.id } });
};
