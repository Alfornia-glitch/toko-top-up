import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createModuleBoundariesCore } from '../tools/eslint/module-boundaries-core.js';

const ROOT = process.cwd();
const MODULE_ROOT = 'src/lib/modules';
const SOURCE_EXTENSIONS = new Set(['.ts', '.svelte']);
const core = createModuleBoundariesCore(ROOT);

interface Violation {
	file: string;
	rule: string;
	message: string;
}

function walk(directory: string): string[] {
	if (!existsSync(directory)) return [];
	const entries = readdirSync(directory, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) files.push(...walk(full));
		else if (entry.isFile() && SOURCE_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
	}
	return files;
}

const IMPORT_PATTERN = /\b(?:from|import)\s*\(?\s*["']([^"']+)["']/g;
const PG_TABLE_PATTERN = /\.table\(\s*["']([^"']+)["']/g;
const SQLITE_TABLE_PATTERN = /sqliteTable\(\s*["']([^"']+)["']/g;

function isSchemaFile(rel: string): boolean {
	return /\/infra\/(pg|sqlite)\/schema\.ts$/.test(rel);
}

function expectedPrefix(rel: string): string | null {
	const chain = core.moduleChain(rel);
	return chain ? `${chain.join('_')}_` : null;
}

function importsOf(source: string): string[] {
	const found: string[] = [];
	for (const match of source.matchAll(IMPORT_PATTERN)) {
		if (match[1]) found.push(match[1]);
	}
	return found;
}

const violations: Violation[] = [];
const moduleFiles = walk(path.join(ROOT, MODULE_ROOT));

for (const file of moduleFiles) {
	const rel = core.toRelative(file);
	const source = readFileSync(file, 'utf8');

	if (isSchemaFile(rel)) {
		const prefix = expectedPrefix(rel);
		if (!prefix) {
			violations.push({
				file: rel,
				rule: 'unknown-module',
				message: 'Schema file is not inside a module.'
			});
			continue;
		}

		for (const pattern of [PG_TABLE_PATTERN, SQLITE_TABLE_PATTERN]) {
			pattern.lastIndex = 0;
			for (const match of source.matchAll(pattern)) {
				const table = match[1];
				if (!table) continue;
				if (!table.startsWith(prefix)) {
					violations.push({
						file: rel,
						rule: 'table-prefix',
						message: `Table "${table}" must start with "${prefix}".`
					});
				}
			}
		}
	}

	const sourceMeta = core.getMeta(rel);
	if (!sourceMeta.chain || !['infra', 'pg', 'sqlite'].includes(sourceMeta.layer ?? '')) continue;

	for (const specifier of importsOf(source)) {
		if (specifier.startsWith('#db/schema') || specifier.startsWith('#db/query')) {
			violations.push({
				file: rel,
				rule: 'legacy-db',
				message: `Module infrastructure may not import "${specifier}"; use the module schema instead.`
			});
			continue;
		}

		const target = core.resolveImport(specifier, file);
		if (!target) continue;
		const targetMeta = core.getMeta(target);
		if (!targetMeta.chain) continue;
		if (!isSchemaFile(target)) continue;
		if (core.sameChain(sourceMeta.chain, targetMeta.chain)) continue;

		violations.push({
			file: rel,
			rule: 'foreign-schema',
			message: `Module infrastructure may not import another module's schema "${target}".`
		});
	}
}

if (violations.length > 0) {
	for (const violation of violations) {
		console.error(`${violation.file} [${violation.rule}] ${violation.message}`);
	}
	console.error(`\nx ${violations.length} data ownership violation(s).`);
	process.exit(1);
}

console.log(`✔ data ownership ok (${moduleFiles.length} module files checked)`);
