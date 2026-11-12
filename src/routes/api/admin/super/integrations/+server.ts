import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { integrationsStatus } from '#lib/server/platform/integrations.ts';

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	return Response.json({ data: integrationsStatus() });
};
