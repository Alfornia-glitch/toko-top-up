import type { RequestHandler } from './$types';
import { getSiteSettings } from '#lib/server/modules/storefront/site.ts';

export const GET: RequestHandler = async () => Response.json({ data: await getSiteSettings() });
