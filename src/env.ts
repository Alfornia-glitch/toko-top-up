import { defineEnvVars } from '@sveltejs/kit/env';

function provider<const T extends readonly string[]>(name: string, allowed: T) {
	return (value: string | undefined): T[number] => {
		if (!value) {
			throw new Error(`${name} is required (expected one of: ${allowed.join(', ')})`);
		}

		if (!(allowed as readonly string[]).includes(value)) {
			throw new Error(`${name} must be one of: ${allowed.join(', ')} (received "${value}")`);
		}

		return value as T[number];
	};
}

export const variables = defineEnvVars({
	DB_PROVIDER: {
		description: 'Database backend: "sqlite" (local better-sqlite3 file) or "postgres" (Supabase)',
		schema: provider('DB_PROVIDER', ['sqlite', 'postgres'] as const)
	},
	STORAGE_PROVIDER: {
		description: 'Media backend: "supabase" (Storage) or "rustfs" (S3-compatible)',
		schema: provider('STORAGE_PROVIDER', ['supabase', 'rustfs'] as const)
	},
	SQLITE_PATH: {
		description: 'File path of the local SQLite database, used when DB_PROVIDER=sqlite',
		schema: (value) => value || './data/ecommerce.sqlite'
	},
	DATABASE_URL: {
		description:
			'Supabase Postgres connection string (session pooler recommended), required when DB_PROVIDER=postgres',
		schema: (value) => value
	},
	BETTER_AUTH_SECRET: {},
	BETTER_AUTH_URL: {},
	GOOGLE_CLIENT_ID: { schema: (value) => value },
	GOOGLE_CLIENT_SECRET: { schema: (value) => value },
	SUPABASE_URL: {
		description: 'Project URL of the Supabase instance, e.g. https://<project-ref>.supabase.co',
		schema: (value) => value
	},
	SUPABASE_SECRET_KEY: {
		description:
			'Server-only secret key (sb_secret_…) used to write to Storage; bypasses Storage RLS',
		schema: (value) => value
	},
	SUPABASE_STORAGE_BUCKET: {
		description: 'Name of the public Storage bucket that receives uploaded media',
		schema: (value) => value
	},
	RUSTFS_ENDPOINT: {
		description: 'Base URL of the RustFS/S3-compatible endpoint, e.g. http://127.0.0.1:9000',
		schema: (value) => value
	},
	RUSTFS_REGION: {
		description: 'S3 region string reported to RustFS',
		schema: (value) => value || 'us-east-1'
	},
	RUSTFS_BUCKET: {
		description: 'Bucket that receives uploaded media',
		schema: (value) => value
	},
	RUSTFS_ACCESS_KEY: {
		description: 'Access key id for the RustFS/S3-compatible endpoint',
		schema: (value) => value
	},
	RUSTFS_SECRET_KEY: {
		description: 'Secret access key for the RustFS/S3-compatible endpoint',
		schema: (value) => value
	},
	RUSTFS_PUBLIC_URL: {
		description: 'Public base URL used to build permanent media URLs (no trailing slash)',
		schema: (value) => value
	},
	QRIS_IMAGE_URL: {
		description:
			'Merchant QRIS image shown at payment time (URL or /static path); required for QRIS',
		schema: (value) => value
	},
	PAYMENT_PROOF_DIR: {
		description: 'Private directory for payment proof images (must not be publicly served)',
		schema: (value) => value || './data/payment-proofs'
	},
	PAYMENT_WINDOW_MINUTES: {
		description: 'Minutes a customer has to pay and upload proof before the order expires',
		schema: (value) => value
	},
	PAYMENT_EXPIRE_SECRET: {
		description: 'Shared secret for the scheduled POST /api/internal/payments/expire endpoint',
		schema: (value) => value
	}
});
