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
	SUPABASE_SERVICE_ROLE_KEY: {
		description:
			'Server-only secret key (sb_secret_… or the legacy service_role JWT) used to write to Storage'
	},
	SUPABASE_STORAGE_BUCKET: {
		description: 'Name of the public Storage bucket that receives uploaded media'
	}
});
