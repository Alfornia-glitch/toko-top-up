import { getStorageBackend } from './backend.ts';
import { MediaError, type UploadedMedia } from './types.ts';

export { MediaError, type UploadedMedia } from './types.ts';

export const DEFAULT_FOLDER = 'media';

export const ADMIN_FOLDERS = [
	'products',
	'categories',
	'brands',
	'banners',
	'testimonials',
	'avatars',
	'reviews',
	'returns',
	'support',
	'media'
] as const;

export const CUSTOMER_FOLDERS = ['avatars'] as const;

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

export function canUploadToFolder(role: string | null | undefined, folder: string): boolean {
	if (role === 'admin' || role === 'superadmin') {
		return (ADMIN_FOLDERS as readonly string[]).includes(folder);
	}

	return (CUSTOMER_FOLDERS as readonly string[]).includes(folder);
}

export async function deleteMedia(path: string): Promise<void> {
	if (!path || path.includes('..') || path.startsWith('/')) {
		throw new MediaError(400, 'Invalid media path');
	}

	await getStorageBackend().delete(path);
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
	const url = await getStorageBackend().upload(path, file);

	return {
		path,
		url,
		contentType: file.type,
		size: file.size
	};
}
