import type { RequestHandler } from './$types';
import type { ContentKind } from '#lib/server/modules/content/site-content.ts';
import { requireAdmin } from '#lib/server/modules/admin/access.ts';
import { auditRequest } from '#lib/server/modules/admin/audit.ts';
import {
	announcementWriteSchema,
	bannerWriteSchema,
	testimonialWriteSchema
} from '#lib/server/modules/admin/validation.ts';
import { createContent, listContent } from '#lib/server/modules/content/site-content.ts';

const KINDS: ContentKind[] = ['banners', 'announcements', 'testimonials'];

function kindOf(value: string): ContentKind | null {
	return KINDS.includes(value as ContentKind) ? (value as ContentKind) : null;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireAdmin(locals.user);
	if (denied) return denied;
	const kind = kindOf(params.kind);
	if (!kind) return Response.json({ error: 'Unknown content type' }, { status: 404 });
	return Response.json({ data: await listContent(kind) });
};

export const POST: RequestHandler = async (event) => {
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
	const id = await createContent(kind, parsed.data as Record<string, unknown>);
	await auditRequest(event, event.locals.user!.id, {
		action: `${kind}.create`,
		entityType: kind,
		entityId: id,
		after: parsed.data
	});
	return Response.json({ data: { id } }, { status: 201 });
};
