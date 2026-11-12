export const MAX_BYTES = 5 * 1024 * 1024;

export const EXTENSION_BY_TYPE: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/avif': 'avif',
	'image/gif': 'gif'
};

export const ALLOWED_TYPES = Object.keys(EXTENSION_BY_TYPE);
