import type { RequestHandler } from './$types';
import { homeData } from '#lib/server/modules/storefront/catalog.ts';

export const GET: RequestHandler = async () => Response.json({ data: await homeData() });
