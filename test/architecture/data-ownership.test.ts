// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const modulesRoot = path.join(root, 'src/lib/modules');
const fixtures = {
	'__data_bad_prefix__/infra/pg/schema.ts': `import { pgSchema } from 'drizzle-orm/pg-core';\nconst shop = pgSchema('shop');\nexport const wrong = shop.table('wrong_name', {});\n`,
	'__data_owner__/infra/pg/schema.ts': `import { pgSchema } from 'drizzle-orm/pg-core';\nconst shop = pgSchema('shop');\nexport const ok = shop.table('__data_owner___items', {});\n`,
	'__data_foreign__/infra/pg/repository.ts': `import '../../../__data_owner__/infra/pg/schema.ts';\nexport const repo = 1;\n`
};

async function writeFixtures(): Promise<void> {
	for (const [relative, contents] of Object.entries(fixtures)) {
		const absolute = path.join(modulesRoot, relative);
		await mkdir(path.dirname(absolute), { recursive: true });
		await writeFile(absolute, contents);
	}
}

async function removeFixtures(): Promise<void> {
	for (const prefix of new Set(Object.keys(fixtures).map((file) => file.split('/')[0]))) {
		await rm(path.join(modulesRoot, prefix), { recursive: true, force: true });
	}
}

function runCheck(): { status: number | null; output: string } {
	const result = spawnSync(process.execPath, ['scripts/check-data-ownership.ts'], {
		cwd: root,
		encoding: 'utf8'
	});
	return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe('data ownership guard', () => {
	beforeAll(writeFixtures);
	afterAll(removeFixtures);

	test('rejects bad table prefixes and foreign schema imports', () => {
		const result = runCheck();
		expect(result.status).toBe(1);
		expect(result.output).toContain('Table "wrong_name" must start with "__data_bad_prefix___"');
		expect(result.output).toContain("may not import another module's schema");
	});

	test('passes after the violating fixtures are removed', async () => {
		await removeFixtures();
		const result = runCheck();
		expect(result.status).toBe(0);
		expect(result.output).toContain('data ownership ok');
	});
});
