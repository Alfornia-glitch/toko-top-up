import { defineConfig } from 'drizzle-kit';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!url) {
	throw new Error('DIRECT_URL or DATABASE_URL is required when DB_PROVIDER=postgres');
}

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.pg.ts',
	out: './migrations/pg',
	schemaFilter: ['auth_app', 'shop'],
	dbCredentials: { url }
});
