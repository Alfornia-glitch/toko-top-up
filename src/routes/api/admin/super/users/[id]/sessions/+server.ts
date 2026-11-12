import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { auditRequest } from '#lib/server/http/audit.ts';
import { getUser, revokeSession } from '#lib/server/platform/accounts.ts';

export const GET: RequestHandler = async ({ locals, params }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	const user = await getUser(params.id, locals.actor);
	if (!user) return Response.json({ error: 'User not found' }, { status: 404 });
	return Response.json({ data: user.sessions });
};

export const DELETE: RequestHandler = async (event) => {
	const denied = requireSuperadmin(event.locals.user);
	if (denied) return denied;
	const sessionId = event.url.searchParams.get('sessionId');
	if (!sessionId) return Response.json({ error: 'sessionId is required' }, { status: 400 });
	const revoked = await revokeSession(event.params.id, sessionId);
	if (!revoked) return Response.json({ error: 'Session not found' }, { status: 404 });
	await auditRequest(event, event.locals.user!.id, {
		action: 'user.revoke_session',
		entityType: 'session',
		entityId: sessionId
	});
	return Response.json({ data: { id: sessionId } });
};
