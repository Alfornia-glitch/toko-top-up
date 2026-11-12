import {
	DB_PROVIDER,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	RUSTFS_ENDPOINT,
	STORAGE_PROVIDER,
	SUPABASE_URL
} from '$app/env/private';

export function integrationsStatus() {
	return {
		db: { provider: DB_PROVIDER, configured: true },
		storage: {
			provider: STORAGE_PROVIDER,
			configured: STORAGE_PROVIDER === 'supabase' ? Boolean(SUPABASE_URL) : Boolean(RUSTFS_ENDPOINT)
		},
		google: { configured: Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) },
		paymentGateway: { configured: false, note: 'Out of scope for this implementation' }
	};
}
