/**
 * Fails when markup or code hard-codes a colour instead of using a theme token (see
 * `src/lib/shared/theme.ts`), so a superadmin's theme keeps reaching every surface.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/', import.meta.url));

/** Fixed on purpose: brand logos, user-entered swatches, and the theme definition itself. */
const ALLOWLIST = [
	'auth/SocialButtons.svelte',
	'catalog/ProductOptionsEditor.svelte',
	'shared/theme.ts',
	'assets/favicon.svg'
];

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab)\((?!0,\s*0,\s*0,)/;
const PALETTE =
	/\b(?:bg|text|border|ring|fill|stroke|divide|from|via|to|outline)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/;

function walk(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			if (name !== 'paraglide') walk(path, files);
		} else if (/\.(svelte|ts)$/.test(path)) files.push(path);
	}
	return files;
}

const problems: string[] = [];
for (const file of walk(ROOT)) {
	const rel = relative(ROOT, file);
	if (ALLOWLIST.some((entry) => rel.endsWith(entry))) continue;

	readFileSync(file, 'utf8')
		.split('\n')
		.forEach((line, index) => {
			// `{#each}` / `{#if}` blocks and `#lib/...` imports are not colours.
			const text = line.replace(/\{[#:/@][a-z]+/g, '').replace(/['"`]#[a-z]+[/\w.-]*/g, '');
			if (HEX.test(text) || FUNCTION.test(text) || PALETTE.test(text)) {
				problems.push(`${rel}:${index + 1}: ${line.trim().slice(0, 120)}`);
			}
		});
}

if (problems.length > 0) {
	console.error(
		`Hard-coded colours found; use theme tokens (bg-primary, text-muted-foreground, ...):\n`
	);
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log('No hard-coded colours.');
