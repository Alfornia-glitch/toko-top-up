import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createModuleBoundariesCore } from '../tools/eslint/module-boundaries-core.js';

const ROOT = process.cwd();
const MODULE_ROOT = 'src/lib/modules';
const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.svelte']);
const core = createModuleBoundariesCore(ROOT);

interface Violation {
	file: string;
	line: number;
	rule: string;
	message: string;
}

function walk(directory: string): string[] {
	if (!existsSync(directory)) return [];
	const entries = readdirSync(directory, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...walk(full));
		} else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
			files.push(full);
		}
	}
	return files;
}

function toRelative(absolute: string): string {
	return core.toRelative(absolute);
}

const IMPORT_PATTERNS = [
	/\bfrom\s+["']([^"']+)["']/g,
	/\bimport\s+["']([^"']+)["']/g,
	/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
];

function importsOf(source: string): Array<{ specifier: string; line: number }> {
	const found: Array<{ specifier: string; line: number }> = [];
	for (const pattern of IMPORT_PATTERNS) {
		pattern.lastIndex = 0;
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1];
			const index = match.index ?? 0;
			const line = source.slice(0, index).split('\n').length;
			found.push({ specifier, line });
		}
	}
	return found;
}

function checkFile(file: string, violations: Violation[]): void {
	const rel = toRelative(file);
	const source = readFileSync(file, 'utf8');
	const sourceMeta = core.getMeta(rel);
	const sourceChain = sourceMeta.chain;
	const sourceLayer = sourceMeta.layer;
	const sourceIsAggregator = sourceMeta.isAggregator;
	const sourceIsAppRoot = sourceMeta.isAppRoot;
	const sourceIsIndex = sourceMeta.isIndex;

	for (const { specifier, line } of importsOf(source)) {
		const add = (rule: string, message: string): void => {
			violations.push({ file: rel, line, rule, message });
		};

		if (sourceLayer === 'domain' && core.isPureForbidden(specifier)) {
			add('domain-pure', `Domain must stay pure; '${specifier}' is not allowed.`);
			continue;
		}
		if (core.isFramework(specifier)) {
			if (sourceLayer === 'domain') {
				add('domain-pure', `Domain must stay pure; '${specifier}' is not allowed.`);
			}
			continue;
		}
		if (sourceLayer === 'application' && core.isServerOnly(specifier)) {
			add(
				'application-server',
				`Application may not import server-only code; '${specifier}' is not allowed.`
			);
			continue;
		}

		const first = specifier.charCodeAt(0);
		if (first !== 46 && first !== 35 && first !== 36) continue;

		const target = core.resolveImport(specifier, file);
		if (!target) continue;
		const targetMeta = core.getMeta(target);
		const targetChain = targetMeta.chain;
		const targetLayer = targetMeta.layer;

		if (sourceMeta.isShared && targetChain) {
			add('shared-no-modules', 'Shared must not import modules.');
			continue;
		}

		if (targetChain && sourceChain && targetMeta.dialect && !sourceIsAggregator) {
			if (!core.sameChain(sourceChain, targetChain)) {
				add(
					'schema-aggregator',
					'Only the database schema aggregator may import module infrastructure schemas.'
				);
				continue;
			}
		}

		if (sourceChain && targetChain) {
			if (sourceLayer === 'domain') {
				add('domain-pure', 'Domain must not import module code.');
				continue;
			}
			if (
				sourceLayer === 'application' &&
				(targetLayer === 'infra' ||
					targetLayer === 'pg' ||
					targetLayer === 'sqlite' ||
					targetLayer === 'ui')
			) {
				add('application-no-infra', 'Application must not import infrastructure or UI.');
				continue;
			}
			if (
				(sourceLayer === 'pg' && targetLayer === 'sqlite') ||
				(sourceLayer === 'sqlite' && targetLayer === 'pg')
			) {
				add('adapter-isolation', 'Postgres and SQLite adapters must not import each other.');
				continue;
			}
			if (sourceIsIndex && targetMeta.isServer) {
				add('index-no-server', 'index.ts must not import server.ts or *.server.ts.');
				continue;
			}

			const kind = core.relation(sourceChain, targetChain);
			if (kind === 'same') continue;

			if (kind === 'descendant') {
				add('descendant', 'A module must not import an ancestor module.');
				continue;
			}
			if (kind === 'ancestor') {
				const depth = targetChain.length - sourceChain.length;
				if (depth === 1 && targetMeta.isEntry) continue;
				add('ancestor-deep', "An ancestor may import only a direct child's index.ts or server.ts.");
				continue;
			}

			if (targetChain.length === 1 && targetMeta.isEntry) continue;
			add('nested-private', `Nested module '${targetChain.join('/')}' is private to its parent.`);
			continue;
		}

		if (sourceMeta.isRoute && targetChain) {
			if (targetChain.length === 1 && targetMeta.isEntry) continue;
			add('route-deep', 'Routes may import only top-level module entries.');
			continue;
		}

		if (sourceIsAppRoot && targetChain) {
			if (targetChain.length === 1 && targetMeta.isEntry) continue;
			add('app-root-deep', 'The app root may import only top-level module entries.');
		}
	}
}

const files = [
	...walk(path.join(ROOT, MODULE_ROOT)),
	...walk(path.join(ROOT, 'src/lib/shared')),
	...walk(path.join(ROOT, 'src/routes')),
	...walk(path.join(ROOT, 'src/lib/server'))
].filter((file) => !toRelative(file).startsWith('src/lib/frontend/'));

const violations: Violation[] = [];
for (const file of files) {
	checkFile(file, violations);
}

if (violations.length > 0) {
	for (const violation of violations) {
		console.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`);
	}
	console.error(`\nx ${violations.length} module boundary violation(s).`);
	process.exit(1);
}

console.log(`✔ module boundaries ok (${files.length} files checked)`);
