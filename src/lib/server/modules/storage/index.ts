import { StorageClient, isStorageError } from '@supabase/storage-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET, SUPABASE_URL } from '$app/env/private';

export const DEFAULT_FOLDER = 'media';

export const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/avif': 'avif',
	'image/gif': 'gif'
};

export const ALLOWED_TYPES = Object.keys(EXTENSION_BY_TYPE);

const FOLDER_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

let client: StorageClient | undefined;

/**
 * Lazy so that importing this module never touches the network configuration
 * unless an upload is actually attempted. Both `apikey` and `Authorization`
 * are required by the Storage REST API — storage-js only forwards the headers
 * it is given.
 */
function storage(): StorageClient {
	client ??= new StorageClient(`${SUPABASE_URL}/storage/v1`, {
		apikey: SUPABASE_SERVICE_ROLE_KEY,
		Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
	});

	return client;
}

export class MediaError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.name = 'MediaError';
		this.status = status;
	}
}

export interface UploadedMedia {
	path: string;
	url: string;
	contentType: string;
	size: number;
}

export function isAllowedType(type: string): boolean {
	return type in EXTENSION_BY_TYPE;
}

/** Restricts the optional `folder` form field to a single safe path segment. */
export function normaliseFolder(value: FormDataEntryValue | null): string {
	if (typeof value !== 'string' || value === '') return DEFAULT_FOLDER;

	if (!FOLDER_PATTERN.test(value)) {
		throw new MediaError(400, 'Invalid folder: use lowercase letters, digits or dashes');
	}

	return value;
}

export async function uploadMedia(file: File, folder = DEFAULT_FOLDER): Promise<UploadedMedia> {
	if (!isAllowedType(file.type)) {
		throw new MediaError(400, `Unsupported file type: ${file.type || 'unknown'}`);
	}

	if (file.size === 0) {
		throw new MediaError(400, 'File is empty');
	}

	if (file.size > MAX_BYTES) {
		throw new MediaError(413, `File exceeds the ${MAX_BYTES / (1024 * 1024)} MiB limit`);
	}

	const path = `${folder}/${crypto.randomUUID()}.${EXTENSION_BY_TYPE[file.type]}`;
	const bucket = storage().from(SUPABASE_STORAGE_BUCKET);

	const { error } = await bucket.upload(path, file, {
		contentType: file.type,
		cacheControl: '3600',
		upsert: false
	});

	if (error) throw toMediaError(error);

	return {
		path,
		url: bucket.getPublicUrl(path).data.publicUrl,
		contentType: file.type,
		size: file.size
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
