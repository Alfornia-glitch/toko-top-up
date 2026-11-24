/** Longest edge kept for uploaded media; storefront images never render wider than this. */
const MAX_EDGE = 1600;
const WEBP_QUALITY = 0.82;
/** Images already this small and within MAX_EDGE are uploaded untouched. */
const SKIP_BELOW_BYTES = 200 * 1024;
/** GIF (animation) and AVIF (already efficient) are passed through as they are. */
const COMPRESSIBLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Downscales and re-encodes an image to WebP in the browser before upload, which cuts storage
 * and every later download of it. Falls back to the original file whenever that is not smaller.
 */
export async function compressImage(file: File): Promise<File> {
	if (!COMPRESSIBLE.has(file.type)) return file;

	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		return file;
	}

	try {
		const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
		if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

		const canvas = document.createElement('canvas');
		canvas.width = Math.round(bitmap.width * scale);
		canvas.height = Math.round(bitmap.height * scale);
		const context = canvas.getContext('2d');
		if (!context) return file;
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
		);
		// Browsers without a WebP encoder silently return PNG; keep the original then.
		if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;

		return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
	} finally {
		bitmap.close();
	}
}
