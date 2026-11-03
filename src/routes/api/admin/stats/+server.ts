import type { RequestHandler } from './$types';
import { getDashboardStats } from '#lib/server/modules/admin/stats.ts';

export const GET: RequestHandler = async () => {
	try {
		const data = await getDashboardStats();

		return Response.json({ data });
	} catch (error) {
		console.error('[api/admin/stats] failed', error);

		return Response.json({ error: 'Could not load dashboard stats' }, { status: 500 });
	}
};
