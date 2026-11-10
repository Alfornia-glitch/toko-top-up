// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { resolveConfig } from '#lib/server/config.ts';

const base = {
	DB_PROVIDER: 'sqlite' as const,
	STORAGE_PROVIDER: 'rustfs' as const,
	SQLITE_PATH: './data/test.sqlite',
	DATABASE_URL: undefined
};

describe('resolveConfig', () => {
	test('builds the SQLite self-host profile', () => {
		expect(resolveConfig(base)).toEqual({
			database: { provider: 'sqlite', path: './data/test.sqlite' },
			storage: { provider: 'rustfs' }
		});
	});

	test('builds the Postgres cloud profile', () => {
		const config = resolveConfig({
			...base,
			DB_PROVIDER: 'postgres',
			STORAGE_PROVIDER: 'supabase',
			DATABASE_URL: 'postgres://example'
		});

		expect(config).toEqual({
			database: { provider: 'postgres', url: 'postgres://example' },
			storage: { provider: 'supabase' }
		});
	});

	test('requires DATABASE_URL for Postgres', () => {
		expect(() =>
			resolveConfig({ ...base, DB_PROVIDER: 'postgres', DATABASE_URL: undefined })
		).toThrow('DATABASE_URL must be set when DB_PROVIDER=postgres');
	});

	test('rejects SQLite with Supabase Storage', () => {
		expect(() => resolveConfig({ ...base, STORAGE_PROVIDER: 'supabase' })).toThrow(
			'STORAGE_PROVIDER=supabase is not supported with DB_PROVIDER=sqlite'
		);
	});
});
