import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { dangerActionSchema } from '#lib/server/http/admin-validation.ts';
import { runDangerAction } from '#lib/server/platform/danger.ts';

export const POST: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return Response.json(
			{ error: 'Expected a JSON body', code: 'invalid_json_body' },
			{ status: 400 }
		);
	}
	const parsed = dangerActionSchema.safeParse(body);
	if (!parsed.success)
		return Response.json(
			{ error: 'Typed confirmation required', code: 'danger_confirmation_required' },
			{ status: 422 }
		);
	const result = await runDangerAction(parsed.data.action, event.locals.actor);
	await auditRequest(event, event.locals.user!.id, {
		action: 'danger.run',
		entityType: 'system',
		entityId: parsed.data.action,
		after: result
	});
	return Response.json({ data: result });
};
