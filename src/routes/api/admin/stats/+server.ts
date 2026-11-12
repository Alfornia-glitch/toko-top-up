import type { RequestHandler } from './$types';
import { unwrap } from '#shared';

export const GET: RequestHandler = async ({ locals }) =>
	Response.json({ data: unwrap(await locals.services.reporting.commerce.dashboard(locals.actor)) });
