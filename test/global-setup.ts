import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default function setup(): () => void {
	const directory = mkdtempSync(join(tmpdir(), 'shopix-contract-'));
	const sqlitePath = join(directory, 'contract.sqlite');

	runPush({ DB_PROVIDER: 'sqlite', SQLITE_PATH: sqlitePath });
	process.env.TEST_SQLITE_PATH = sqlitePath;

	const testDatabaseUrl = process.env.TEST_DATABASE_URL;
	if (testDatabaseUrl) {
		runPush({
			DB_PROVIDER: 'postgres',
			DATABASE_URL: testDatabaseUrl,
			DIRECT_URL: testDatabaseUrl
		});
	}

	return () => {
		rmSync(directory, { recursive: true, force: true });
	};
}

function runPush(overrides: Record<string, string>): void {
	execFileSync('bun', ['run', 'db:push'], {
		cwd: process.cwd(),
		env: { ...process.env, ...overrides },
		stdio: 'inherit'
	});
}
