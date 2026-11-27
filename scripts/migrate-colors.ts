/**
 * One-off codemod: rewrites hard-coded colours in markup to the theme tokens from `layout.css`
 * (`text-[#0a0a0a]` -> `text-foreground`, `bg-emerald-50` -> `bg-success/10`, ...), so the
 * superadmin theme reaches every surface. Usage: `tsx scripts/migrate-colors.ts [--write]`.
 * Anything it cannot map safely (`text-white`, SVG fills, gradients) is left for manual review.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const WRITE = process.argv.includes('--write');

/** Files whose colours are fixed on purpose (brand logos, user data). */
const ALLOWLIST = ['auth/SocialButtons.svelte', 'ProductOptionsEditor.svelte'];

/** hex -> [token, default opacity suffix] */
const HEX: Record<string, [string, string]> = {
	'0a0a0a': ['foreground', ''],
	'737373': ['muted-foreground', ''],
	'525252': ['muted-foreground', ''],
	e5e5e5: ['border', ''],
	d4d4d4: ['border', ''],
	a3a3a3: ['ring', ''],
	f5f5f5: ['muted', ''],
	'171717': ['primary', ''],
	fafafa: ['primary-foreground', ''],
	'262626': ['primary', '/90'],
	dc2626: ['destructive', ''],
	b91c1c: ['destructive', ''],
	fef2f2: ['destructive', '/10'],
	fecaca: ['destructive', '/30'],
	'16a34a': ['success', ''],
	d97706: ['warning', ''],
	b45309: ['warning', '']
};

const PALETTE: Record<string, [string, string]> = {
	'red-600': ['destructive', ''],
	'emerald-400': ['success', ''],
	'emerald-500': ['success', ''],
	'emerald-600': ['success', ''],
	'emerald-700': ['success', ''],
	'emerald-50': ['success', '/10'],
	'amber-400': ['rating', ''],
	'amber-300': ['warning', '/30'],
	'amber-50': ['warning', '/10'],
	'amber-900': ['warning', ''],
	'sky-50': ['muted', ''],
	'gray-50': ['muted', ''],
	'gray-100': ['muted', ''],
	'gray-800': ['foreground', ''],
	'neutral-800': ['primary', '/90']
};

const counts = new Map<string, number>();
const bump = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);

function convertLine(line: string): string {
	const inStyle = line.includes('style=');

	let out = line.replace(
		/\b(bg|text|border(?:-[trblxy])?|divide|ring|fill|stroke|from|via|to|outline)-\[#([0-9a-fA-F]{6})\](\/\d+)?/g,
		(match, util: string, hex: string, opacity?: string) => {
			const mapped = HEX[hex.toLowerCase()];
			if (!mapped) {
				bump(`unmapped #${hex}`);
				return match;
			}
			bump(`#${hex.toLowerCase()}`);
			return `${util}-${mapped[0]}${opacity ?? mapped[1]}`;
		}
	);

	out = out.replace(
		/\b(bg|text|border(?:-[trblxy])?|divide|ring|fill|stroke|from|via|to|outline)-((?:red|emerald|amber|sky|gray|neutral)-\d{2,3})(\/\d+)?\b/g,
		(match, util: string, shade: string, opacity?: string) => {
			const mapped = PALETTE[shade];
			if (!mapped) {
				bump(`unmapped ${shade}`);
				return match;
			}
			bump(shade);
			return `${util}-${mapped[0]}${opacity ?? mapped[1]}`;
		}
	);

	// The old border-ish neutrals used as text (empty stars) read as muted text, not as a border colour.
	out = out.replace(/\btext-border\b/g, 'text-muted-foreground/40');

	out = out.replace(/\bbg-white\b(?!\/)/g, () => {
		bump('bg-white');
		return line.includes('min-h-screen') ? 'bg-background' : 'bg-card';
	});

	// Ink-coloured translucent rings and shadows follow the foreground token.
	out = out.replace(
		/rgba\((?:10,\s*10,\s*10|23,\s*23,\s*23),\s*([\d.]+)\)/g,
		(_match, alpha: string) => {
			bump('rgba ink');
			const percent = Math.round(Number(alpha) * 100);
			return inStyle
				? `color-mix(in oklab, var(--foreground) ${percent}%, transparent)`
				: `color-mix(in_oklab,var(--foreground)_${percent}%,transparent)`;
		}
	);
	out = out.replace(/bg-\[rgba\(217,119,6,0\.2\)\]/g, () => {
		bump('rgba amber');
		return 'bg-rating/20';
	});
	if (inStyle) {
		out = out.replace(/rgb\(255,\s*255,\s*255\)/g, () => {
			bump('rgb white');
			return 'var(--background)';
		});
	}

	return out;
}

function walk(dir: string, files: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			if (name === 'paraglide' || path.includes('/routes/api')) continue;
			walk(path, files);
		} else if (path.endsWith('.svelte')) files.push(path);
	}
	return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
	const rel = relative(ROOT, file);
	if (ALLOWLIST.some((entry) => rel.endsWith(entry))) continue;

	const before = readFileSync(file, 'utf8');
	const after = before.split('\n').map(convertLine).join('\n');
	if (before === after) continue;

	changed += 1;
	if (WRITE) writeFileSync(file, after);
}

console.log(`${WRITE ? 'Rewrote' : 'Would rewrite'} ${changed} files`);
for (const [key, count] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`${count}\t${key}`);
