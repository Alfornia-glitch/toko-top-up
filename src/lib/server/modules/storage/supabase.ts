import { StorageClient, isStorageError } from '@supabase/storage-js';
import { MediaError, type StorageBackend } from './types.ts';

/** Supabase Storage backend used by the managed deployment profile. */
export function createSupabaseBackend(config: {
	url: string;
	secretKey: string;
	bucket: string;
}): StorageBackend {
	let client: StorageClient | undefined;

	/**
	 * Lazy so that constructing the backend never touches the network. Both
	 * `apikey` and `Authorization` are required by the Storage REST API —
	 * storage-js only forwards the headers it is given.
	 */
	function storage(): StorageClient {
		client ??= new StorageClient(`${config.url}/storage/v1`, {
			apikey: config.secretKey,
			Authorization: `Bearer ${config.secretKey}`
		});

		return client;
	}

	return {
		async upload(path, file) {
			const bucket = storage().from(config.bucket);

			const { error } = await bucket.upload(path, file, {
				contentType: file.type,
				cacheControl: '3600',
				upsert: false
			});

			if (error) throw toMediaError(error);

			return bucket.getPublicUrl(path).data.publicUrl;
		}
	};
}

function toMediaError(error: unknown): MediaError {
	if (!isStorageError(error)) {
		console.error('[storage] unexpected upload failure', error);
		return new MediaError(502, 'Storage request failed');
	}

	const status = error.status;
	const code = 'code' in error ? error.code : undefined;

	console.error('[storage] upload rejected', { status, code, message: error.message });

	if (code === 'ResourceAlreadyExists') {
		return new MediaError(409, 'A file with that name already exists');
	}

	if (code === 'PayloadTooLarge' || status === 413) {
		return new MediaError(413, 'File too large for the storage bucket');
	}

	if (code === 'InvalidContentType' || status === 415) {
		return new MediaError(415, 'File type rejected by the storage bucket');
	}

	return new MediaError(502, 'Storage request failed');
}
