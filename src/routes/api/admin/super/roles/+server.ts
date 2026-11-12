import type { RequestHandler } from './$types';
import { requireSuperadmin } from '#lib/server/http/access.ts';
import { userRoleCounts } from '#lib/server/platform/accounts.ts';

const MATRIX = {
	customer: [
		'Read storefront',
		'Manage own profile',
		'View own orders',
		'Submit returns',
		'Open support tickets'
	],
	admin: [
		'All customer permissions',
		'Manage catalog',
		'Manage inventory',
		'Process orders',
		'Manage returns',
		'Moderate reviews',
		'Manage marketing and content'
	],
	superadmin: [
		'All admin permissions',
		'Manage users and roles',
		'Ban users',
		'View audit logs',
		'Manage settings and integrations',
		'Danger zone'
	]
};

export const GET: RequestHandler = async ({ locals }) => {
	const denied = requireSuperadmin(locals.user);
	if (denied) return denied;
	return Response.json({ data: { matrix: MATRIX, counts: await userRoleCounts() } });
};
