import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import type { ProofStorage } from '../domain/payments.ts';

/**
 * Private on-disk storage. The directory must sit outside any static/public root; files are only
 * ever read back through authenticated routes. Stored paths are bare file names, never URLs.
 */
export function createLocalProofStorage(directory: string): ProofStorage {
	const root = resolve(directory);

	return {
		async save(name, bytes) {
			const safe = basename(name);
			await mkdir(root, { recursive: true, mode: 0o700 });
			await writeFile(join(root, safe), bytes, { mode: 0o600, flag: 'wx' });
			return safe;
		},
		async read(path) {
			return new Uint8Array(await readFile(join(root, basename(path))));
		}
	};
}
