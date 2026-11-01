import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	TURSO_DATABASE_URL: {},
	TURSO_AUTH_TOKEN: {},
	BETTER_AUTH_SECRET: {},
	BETTER_AUTH_URL: {},
	GOOGLE_CLIENT_ID: { schema: (value) => value },
	GOOGLE_CLIENT_SECRET: { schema: (value) => value },
	SUPABASE_URL: {
		description: 'Project URL of the Supabase instance, e.g. https://<project-ref>.supabase.co'
	},
	SUPABASE_SECRET_KEY: {
		description:
			'Server-only secret key (sb_secret_…) used to write to Storage; bypasses Storage RLS'
	},
	SUPABASE_STORAGE_BUCKET: {
		description: 'Name of the public Storage bucket that receives uploaded media'
	}
});
