// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const root = path.resolve(import.meta.dirname, '../..');
const modulesRoot = path.join(root, 'src/lib/modules');
const routesRoot = path.join(root, 'src/routes');
const routeFixture = '__arch_test_route__';
const eslintBin = path.join(root, 'node_modules/.bin/eslint');

const fixtures: Record<string, string> = {
	'__arch_legal__/index.ts': `import "./modules/child/index.ts";\nexport const legal = 1;\n`,
	'__arch_legal__/modules/child/index.ts': `export const child = 1;\n`,
	'__arch_chain__/index.ts': `import "./modules/child/index.ts";\nexport const root = 1;\n`,
	'__arch_chain__/modules/child/index.ts': `import "./modules/grand/index.ts";\nexport const child = 1;\n`,
	'__arch_chain__/modules/child/modules/grand/index.ts': `import "./modules/great/index.ts";\nexport const grand = 1;\n`,
	'__arch_chain__/modules/child/modules/grand/modules/great/index.ts': `export const great = 1;\n`,
	'__arch_deep1__/index.ts': `import "./modules/child/domain/secret.ts";\nexport const deep = 1;\n`,
	'__arch_deep1__/modules/child/index.ts': `export const child = 1;\n`,
	'__arch_deep1__/modules/child/domain/secret.ts': `export const secret = 1;\n`,
	'__arch_deep2__/index.ts': `import "./modules/child/modules/grand/index.ts";\nexport const deep = 1;\n`,
	'__arch_deep2__/modules/child/index.ts': `export const child = 1;\n`,
	'__arch_deep2__/modules/child/modules/grand/index.ts': `export const grand = 1;\n`,
	'__arch_deep3__/index.ts': `import "./modules/child/modules/grand/modules/great/index.ts";\nexport const deep = 1;\n`,
	'__arch_deep3__/modules/child/index.ts': `export const child = 1;\n`,
	'__arch_deep3__/modules/child/modules/grand/index.ts': `export const grand = 1;\n`,
	'__arch_deep3__/modules/child/modules/grand/modules/great/index.ts': `export const great = 1;\n`,
	'__arch_depth4__/index.ts': `import "./modules/child/modules/grand/modules/great/modules/deepest/index.ts";\nexport const root = 1;\n`,
	'__arch_depth4__/modules/child/index.ts': `export const child = 1;\n`,
	'__arch_depth4__/modules/child/modules/grand/index.ts': `export const grand = 1;\n`,
	'__arch_depth4__/modules/child/modules/grand/modules/great/index.ts': `export const great = 1;\n`,
	'__arch_depth4__/modules/child/modules/grand/modules/great/modules/deepest/index.ts': `export const deepest = 1;\n`,
	'__arch_descendant__/index.ts': `export const root = 1;\n`,
	'__arch_descendant__/modules/child/index.ts': `import "../../index.ts";\nexport const child = 1;\n`,
	'__arch_index_server__/index.ts': `import "./server.ts";\nexport const index = 1;\n`,
	'__arch_index_server__/server.ts': `export const server = 1;\n`,
	'__arch_domain__/domain/model.ts': `import "drizzle-orm";\nexport const model = 1;\n`,
	'__arch_domain_db__/domain/model.ts': `import { db } from "#db";\nexport const model = db;\n`,
	'__arch_application__/application/use-case.ts': `import "../infra/pg/repo.ts";\nexport const useCase = 1;\n`,
	'__arch_application__/infra/pg/repo.ts': `export const repo = 1;\n`,
	'__arch_application_db__/application/use-case.ts': `import { db } from "#db";\nexport const useCase = db;\n`,
	'__arch_infra_db__/infra/pg/repo.ts': `import { db } from "#db";\nexport const repo = db;\n`,
	'__arch_dialect__/infra/pg/repo.ts': `import "../sqlite/repo.ts";\nexport const pg = 1;\n`,
	'__arch_dialect__/infra/sqlite/repo.ts': `export const sqlite = 1;\n`
};

const fixtureNames = Object.keys(fixtures);

interface LintMessage {
	ruleId: string | null;
	message: string;
	line: number;
}

interface LintResult {
	filePath: string;
	messages: LintMessage[];
}

let results: LintResult[] = [];
let routeResults: LintResult[] = [];

async function writeFixtures(): Promise<void> {
	for (const [relative, contents] of Object.entries(fixtures)) {
		const absolute = path.join(modulesRoot, relative);
		await mkdir(path.dirname(absolute), { recursive: true });
		await writeFile(absolute, contents);
	}
}

function messagesFor(relative: string): LintMessage[] {
	const absolute = path.join(modulesRoot, relative);
	const result = results.find((entry) => entry.filePath === absolute);
	return result?.messages ?? [];
}

function includes(relative: string, fragment: string): boolean {
	return messagesFor(relative).some((message) => message.message.includes(fragment));
}

beforeAll(async () => {
	await rm(path.join(modulesRoot, '__arch_legal__'), { recursive: true, force: true });
	await writeFixtures();
	const routeFile = path.join(routesRoot, routeFixture, '+server.ts');
	await mkdir(path.dirname(routeFile), { recursive: true });
	await writeFile(
		routeFile,
		`import "../../lib/modules/__arch_deep1__/modules/child/domain/secret.ts";\nexport const route = 1;\n`
	);
	const files = fixtureNames.map((relative) => path.join(modulesRoot, relative));
	const lint = spawnSync(eslintBin, ['--format', 'json', ...files], {
		cwd: root,
		encoding: 'utf8'
	});
	const parsed = JSON.parse(lint.stdout || '[]') as LintResult[];
	results = parsed;
	const routeLint = spawnSync(eslintBin, ['--no-ignore', '--format', 'json', routeFile], {
		cwd: root,
		encoding: 'utf8'
	});
	routeResults = JSON.parse(routeLint.stdout || '[]') as LintResult[];
});

afterAll(async () => {
	const prefixes = new Set(fixtureNames.map((relative) => relative.split('/')[0]).filter(Boolean));
	for (const prefix of prefixes) {
		await rm(path.join(modulesRoot, prefix), { recursive: true, force: true });
	}
	await rm(path.join(routesRoot, routeFixture), { recursive: true, force: true });
});

describe('recursive module boundaries', () => {
	test('allows a direct child entry point', () => {
		expect(messagesFor('__arch_legal__/index.ts')).toEqual([]);
	});

	test('allows a parent -> child -> grandchild -> great-grandchild entry chain', () => {
		expect(messagesFor('__arch_chain__/index.ts')).toEqual([]);
		expect(messagesFor('__arch_chain__/modules/child/index.ts')).toEqual([]);
		expect(messagesFor('__arch_chain__/modules/child/modules/grand/index.ts')).toEqual([]);
	});

	test('rejects a depth-1 deep import', () => {
		expect(includes('__arch_deep1__/index.ts', 'Deep import')).toBe(true);
	});

	test('rejects a depth-2 deep import', () => {
		expect(includes('__arch_deep2__/index.ts', 'deeper descendant')).toBe(true);
	});

	test('rejects a depth-3 deep import', () => {
		expect(includes('__arch_deep3__/index.ts', 'deeper descendant')).toBe(true);
	});

	test('rejects a depth-4 throwaway module import', () => {
		expect(includes('__arch_depth4__/index.ts', 'deeper descendant')).toBe(true);
	});

	test('rejects a descendant importing an ancestor', () => {
		expect(includes('__arch_descendant__/modules/child/index.ts', 'ancestor')).toBe(true);
	});

	test('rejects an index entry importing server.ts', () => {
		expect(includes('__arch_index_server__/index.ts', 'server.ts')).toBe(true);
	});

	test('keeps domain pure', () => {
		expect(includes('__arch_domain__/domain/model.ts', 'Domain must stay pure')).toBe(true);
	});

	test('keeps domain away from the database client', () => {
		expect(includes('__arch_domain_db__/domain/model.ts', 'Domain must stay pure')).toBe(true);
	});

	test('keeps application away from infrastructure', () => {
		expect(includes('__arch_application__/application/use-case.ts', 'infrastructure')).toBe(true);
	});

	test('keeps application away from the database client', () => {
		expect(includes('__arch_application_db__/application/use-case.ts', 'server-only')).toBe(true);
	});

	test('allows infrastructure to use the database client', () => {
		expect(messagesFor('__arch_infra_db__/infra/pg/repo.ts')).toEqual([]);
	});

	test('keeps adapters isolated', () => {
		expect(includes('__arch_dialect__/infra/pg/repo.ts', 'must not import each other')).toBe(true);
	});

	test('rejects a route deep import', () => {
		const messages = routeResults.flatMap((result) => result.messages);
		expect(messages.some((message) => message.message.includes('Routes may import only'))).toBe(
			true
		);
	});
});
