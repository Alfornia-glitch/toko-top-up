import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { errorBody, NotFoundError } from '#shared';
import { MediaError } from '#lib/server/platform/storage/types.ts';

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (path.endsWith('.ts')) out.push(path);
	}
	return out;
}

function usedKeys(): Set<string> {
	const keys = new Set<string>();
	for (const root of ['src/lib', 'src/routes/api']) {
		for (const file of walk(root)) {
			if (file.includes('paraglide')) continue;
			const text = readFileSync(file, 'utf8');
			for (const m of text.matchAll(/messageKey: '([a-z0-9_]+)'/g)) keys.add(m[1]!);
			for (const m of text.matchAll(/\bcode: '([a-z0-9_]+)'/g)) keys.add(m[1]!);
		}
	}
	return keys;
}

const load = (locale: string) =>
	JSON.parse(readFileSync(`messages/errors/${locale}.json`, 'utf8')) as Record<string, string>;

describe('server error codes are translated', () => {
	it('has errors_<code> in both locales for every messageKey and inline code', () => {
		const id = load('id');
		const en = load('en');
		const missing = [...usedKeys()].filter(
			(key) => !(`errors_${key}` in id && `errors_${key}` in en)
		);
		expect(missing).toEqual([]);
	});

	it('keeps id and en keys in sync', () => {
		expect(Object.keys(load('id'))).toEqual(Object.keys(load('en')));
	});
});

describe('errorBody', () => {
	it('prefers the messageKey and carries params', () => {
		const error = new NotFoundError('Product not found', { messageKey: 'product_not_found' });
		expect(errorBody(error)).toEqual({ error: 'Product not found', code: 'product_not_found' });
	});

	it('serialises MediaError with its key and params', () => {
		const error = new MediaError(413, 'File exceeds the 5 MiB limit', {
			messageKey: 'upload_file_too_large',
			params: { max: 5 }
		});
		expect(errorBody(error)).toEqual({
			error: 'File exceeds the 5 MiB limit',
			code: 'upload_file_too_large',
			params: { max: 5 }
		});
	});
});
