import { pgSchema } from 'drizzle-orm/pg-core';

/** Private commerce schema; created by `scripts/setup-db.ts` before `db:push`. */
export const shopSchema = pgSchema('shop');
