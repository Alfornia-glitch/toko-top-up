import type { RequestHandler } from './$types';
import { assertActor } from '#shared';

export const GET: RequestHandler = async ({ locals }) => {
	const actor = assertActor(locals.actor);
	const [stats, live] = await Promise.all([
		locals.services.reporting.reporting.getStats(actor),
		locals.services.reporting.reporting.getSnapshot(actor)
	]);

	if (!stats.ok) {
		return Response.json({ error: stats.error.message }, { status: stats.error.status });
	}
	if (!live.ok) {
		return Response.json({ error: live.error.message }, { status: live.error.status });
	}

	return Response.json({ data: { stats: stats.value, live: live.value } });
};
