import { defineConfig } from 'drizzle-kit';

const provider = process.env.DB_PROVIDER;

if (provider !== 'sqlite' && provider !== 'postgres') {
	throw new Error(
		'DB_PROVIDER must be "sqlite" or "postgres" (copy env.vps.example or env.supabase.example to .env)'
	);
}

const schema =
	provider === 'postgres'
		? './src/lib/server/db/schema/postgres'
		: './src/lib/server/db/schema/sqlite';

export default provider === 'postgres'
	? defineConfig({
			dialect: 'postgresql',
			schema,
			out: './drizzle',
			// drizzle-kit defaults to ["public"]; the Better Auth tables live in
			// the private auth_app schema, so it must be included explicitly.
			schemaFilter: ['auth_app'],
			dbCredentials: {
				url: (() => {
					const url = process.env.DATABASE_URL;
					if (!url) throw new Error('DATABASE_URL is required when DB_PROVIDER=postgres');
					return url;
				})()
			}
		})
	: defineConfig({
			dialect: 'sqlite',
			schema,
			out: './drizzle',
			dbCredentials: {
				url: process.env.SQLITE_PATH || './data/ecommerce.sqlite'
			}
		});
