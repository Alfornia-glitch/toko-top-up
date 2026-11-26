import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
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
		forcePathStyle: true,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey
		}
	});

	const publicUrl = config.publicUrl.replace(/\/+$/, '');

	return {
		async upload(path, file) {
			try {
				await client.send(
					new PutObjectCommand({
						Bucket: config.bucket,
						Key: path,
						Body: new Uint8Array(await file.arrayBuffer()),
						ContentType: file.type,
						ACL: 'public-read'
					})
				);
			} catch (error) {
				throw toMediaError(error);
			}

			return `${publicUrl}/${path}`;
		},

		async delete(path) {
			try {
				await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: path }));
			} catch (error) {
				throw toMediaError(error);
			}
		}
	};
}

function toMediaError(error: unknown): MediaError {
	const candidate = error as {
		code?: string;
		name?: string;
		status?: number;
		$metadata?: { httpStatusCode?: number };
		message?: string;
	};
	const code = candidate?.code ?? candidate?.name;
	const status = candidate?.status ?? candidate?.$metadata?.httpStatusCode;

	console.error('[storage] rustfs request failed', {
		code,
		status,
		message: candidate?.message ?? String(error)
	});

	if (code === 'EEXIST' || code === 'PreconditionFailed' || status === 409) {
		return new MediaError(409, 'A file with that name already exists', {
			messageKey: 'storage_file_exists'
		});
	}

	if (code === 'EntityTooLarge' || status === 413) {
		return new MediaError(413, 'File too large for the storage bucket', {
			messageKey: 'storage_bucket_file_too_large'
		});
	}

	return new MediaError(502, 'Storage request failed', { messageKey: 'storage_request_failed' });
}
