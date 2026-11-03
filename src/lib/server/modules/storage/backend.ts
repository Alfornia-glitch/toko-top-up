import {
	RUSTFS_ACCESS_KEY,
	RUSTFS_BUCKET,
	RUSTFS_ENDPOINT,
	RUSTFS_PUBLIC_URL,
	RUSTFS_REGION,
	RUSTFS_SECRET_KEY,
	STORAGE_PROVIDER,
	SUPABASE_SECRET_KEY,
	SUPABASE_STORAGE_BUCKET,
	SUPABASE_URL
} from '$app/env/private';
import { createRustfsBackend } from './rustfs.ts';
import { createSupabaseBackend } from './supabase.ts';
import type { StorageBackend } from './types.ts';

export type StorageProvider = typeof STORAGE_PROVIDER;

let backend: StorageBackend | undefined;

function requireValue(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`${name} must be set when STORAGE_PROVIDER=${STORAGE_PROVIDER}`);
	}

	return value;
}

/** Lazy singleton so importing this module never touches credentials or the network. */
export function getStorageBackend(): StorageBackend {
	backend ??=
		STORAGE_PROVIDER === 'rustfs'
			? createRustfsBackend({
					endpoint: requireValue('RUSTFS_ENDPOINT', RUSTFS_ENDPOINT),
					region: RUSTFS_REGION,
					bucket: requireValue('RUSTFS_BUCKET', RUSTFS_BUCKET),
					accessKeyId: requireValue('RUSTFS_ACCESS_KEY', RUSTFS_ACCESS_KEY),
					secretAccessKey: requireValue('RUSTFS_SECRET_KEY', RUSTFS_SECRET_KEY),
					publicUrl: requireValue('RUSTFS_PUBLIC_URL', RUSTFS_PUBLIC_URL)
				})
			: createSupabaseBackend({
					url: requireValue('SUPABASE_URL', SUPABASE_URL),
					secretKey: requireValue('SUPABASE_SECRET_KEY', SUPABASE_SECRET_KEY),
					bucket: requireValue('SUPABASE_STORAGE_BUCKET', SUPABASE_STORAGE_BUCKET)
				});

	return backend;
}
