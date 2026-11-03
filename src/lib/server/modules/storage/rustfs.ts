import { S3Client } from 'bun';
import { MediaError, type StorageBackend } from './types.ts';

/**
 * RustFS (or any S3-compatible server) backend used by the self-hosted VPS
 * deployment profile. Objects are written with `public-read` so the upload
 * endpoint can keep returning permanent public URLs like the Supabase backend.
 */
export function createRustfsBackend(config: {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
	publicUrl: string;
}): StorageBackend {
	const client = new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		bucket: config.bucket,
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey
	});

	const publicUrl = config.publicUrl.replace(/\/+$/, '');

	return {
		async upload(path, file) {
			try {
				await client.file(path).write(file, { type: file.type, acl: 'public-read' });
			} catch (error) {
				throw toMediaError(error);
			}

			return `${publicUrl}/${path}`;
		}
	};
}

function toMediaError(error: unknown): MediaError {
	const candidate = error as { code?: string; status?: number; message?: string };
	const code = candidate?.code;
	const status = candidate?.status;

	console.error('[storage] rustfs upload failed', {
		code,
		status,
		message: candidate?.message ?? String(error)
	});

	if (code === 'EEXIST' || code === 'PreconditionFailed' || status === 409) {
		return new MediaError(409, 'A file with that name already exists');
	}

	if (code === 'EntityTooLarge' || status === 413) {
		return new MediaError(413, 'File too large for the storage bucket');
	}

	return new MediaError(502, 'Storage request failed');
}
