import type { RequestHandler } from './$types';
import { assertActor, errorBody } from '#shared';

export const GET: RequestHandler = async ({ locals }) => {
	const actor = assertActor(locals.actor);
	const [stats, live] = await Promise.all([
		locals.services.reporting.reporting.getStats(actor),
		locals.services.reporting.reporting.getSnapshot(actor)
	]);

	if (!stats.ok) {
		return Response.json(errorBody(stats.error), { status: stats.error.status });
	}
	if (!live.ok) {
		return Response.json(errorBody(live.error), { status: live.error.status });
	}

	return Response.json({ data: { stats: stats.value, live: live.value } });
};
