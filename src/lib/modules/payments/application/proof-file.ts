import { createHash } from 'node:crypto';
import { PROOF_MAX_BYTES, type ProofMime } from '../domain/payments.ts';

/** Reads the real image type from magic bytes; the client-supplied type and extension are ignored. */
export function sniffMime(bytes: Uint8Array): ProofMime | null {
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
		return 'image/jpeg';
	}
	const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (bytes.length >= 8 && png.every((b, i) => bytes[i] === b)) return 'image/png';
	if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
		return 'image/webp';
	}
	return null;
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
	return String.fromCharCode(...bytes.subarray(start, start + length));
}

function concat(chunks: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		out.set(chunk, offset);
		offset += chunk.length;
	}
	return out;
}

function stripJpeg(bytes: Uint8Array): Uint8Array {
	const out: Uint8Array[] = [bytes.subarray(0, 2)];
	let i = 2;
	while (i + 4 <= bytes.length) {
		if (bytes[i] !== 0xff) break;
		const marker = bytes[i + 1]!;
		if (marker === 0xda) break; // start of scan: the rest is image data
		const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
		const end = i + 2 + length;
		// Drop APP1..APP15 (EXIF, XMP, ...) and comments; keep APP0 (JFIF) and APP14 (colour).
		const metadata = (marker >= 0xe1 && marker <= 0xef && marker !== 0xee) || marker === 0xfe;
		if (!metadata) out.push(bytes.subarray(i, end));
		i = end;
	}
	out.push(bytes.subarray(i));
	return concat(out);
}

function stripPng(bytes: Uint8Array): Uint8Array {
	const drop = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const out: Uint8Array[] = [bytes.subarray(0, 8)];
	let i = 8;
	while (i + 12 <= bytes.length) {
		const length = view.getUint32(i);
		const end = i + 12 + length;
		if (!drop.has(ascii(bytes, i + 4, 4))) out.push(bytes.subarray(i, end));
		i = end;
	}
	return concat(out);
}

function stripWebp(bytes: Uint8Array): Uint8Array {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const chunks: Uint8Array[] = [];
	let i = 12;
	while (i + 8 <= bytes.length) {
		const type = ascii(bytes, i, 4);
		const size = view.getUint32(i + 4, true);
		const end = Math.min(i + 8 + size + (size % 2), bytes.length);
		if (type !== 'EXIF' && type !== 'XMP ') {
			const chunk = bytes.slice(i, end);
			if (type === 'VP8X' && chunk.length >= 9) {
				// Clear the EXIF (0x08) and XMP (0x04) presence flags.
				chunk[8] = chunk[8]! & ~0x0c;
			}
			chunks.push(chunk);
		}
		i = end;
	}
	const body = concat(chunks);
	const header = new Uint8Array(12);
	header.set(bytes.subarray(0, 12));
	new DataView(header.buffer).setUint32(4, body.length + 4, true);
	return concat([header, body]);
}

export function stripMetadata(bytes: Uint8Array, mime: ProofMime): Uint8Array {
	if (mime === 'image/jpeg') return stripJpeg(bytes);
	if (mime === 'image/png') return stripPng(bytes);
	return stripWebp(bytes);
}

export function sha256(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex');
}

export const EXTENSIONS: Record<ProofMime, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp'
};

export function exceedsLimit(size: number): boolean {
	return size > PROOF_MAX_BYTES;
}
