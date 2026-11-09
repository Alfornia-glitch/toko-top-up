import { statSync } from 'node:fs';
import path from 'node:path';

export const MODULE_ROOT = 'src/lib/modules';

const FRAMEWORK = /^\$(app|env)(\/|$)/;
const PURE_FORBIDDEN = /^(svelte|drizzle-orm|better-auth|@supabase)(\/|$)/;
const EXTENSION = /\.[a-z0-9]+$/i;
const EXTENSION_CANDIDATES = ['.ts', '.svelte', '.js'];
const INDEX_CANDIDATES = ['/index.ts', '/index.svelte'];

/**
 * @typedef {{
 *   chain: string[] | null,
 *   base: string | null,
 *   layer: string | null,
 *   isRoute: boolean,
 *   isShared: boolean,
 *   isAggregator: boolean,
 *   isAppRoot: boolean,
 *   isIndex: boolean,
 *   isEntry: boolean,
 *   isServer: boolean,
 *   dialect: string | null
 * }} FileMeta
 */

/**
 * Builds the shared module-boundary helpers. The factory closes over its own
 * caches so the ESLint rule and the arch script never share stale state.
 *
 * @param {string} [root]
 */
export function createModuleBoundariesCore(root = process.cwd()) {
	/** @type {{ file: Map<string, boolean>, candidate: Map<string, string>, import: Map<string, string | null>, chain: Map<string, string[] | null>, base: Map<string, string>, layer: Map<string, string>, meta: Map<string, FileMeta> }} */
	const caches = {
		file: new Map(),
		candidate: new Map(),
		import: new Map(),
		chain: new Map(),
		base: new Map(),
		layer: new Map(),
		meta: new Map()
	};

	/** @param {string} absolute */
	function toRelative(absolute) {
		return path.relative(root, absolute).split(path.sep).join('/');
	}

	/** @param {string} rel */
	function isFile(rel) {
		const cached = caches.file.get(rel);
		if (cached !== undefined) return cached;
		let result;
		try {
			result = statSync(path.join(root, rel)).isFile();
		} catch {
			result = false;
		}
		caches.file.set(rel, result);
		return result;
	}

	/** @param {string} rel */
	function resolveCandidate(rel) {
		const cached = caches.candidate.get(rel);
		if (cached !== undefined) return cached;

		let resolved = null;
		if (isFile(rel)) {
			resolved = rel;
		} else if (EXTENSION.test(rel)) {
			if (isFile(`${rel}/index.ts`)) resolved = `${rel}/index.ts`;
		} else {
			for (const extension of EXTENSION_CANDIDATES) {
				if (isFile(`${rel}${extension}`)) {
					resolved = `${rel}${extension}`;
					break;
				}
			}
			if (resolved === null) {
				for (const index of INDEX_CANDIDATES) {
					if (isFile(`${rel}${index}`)) {
						resolved = `${rel}${index}`;
						break;
					}
				}
			}
		}

		if (resolved === null) resolved = rel;
		caches.candidate.set(rel, resolved);
		return resolved;
	}

	/**
	 * @param {string} specifier
	 * @param {string} filename
	 */
	function resolveImport(specifier, filename) {
		if (specifier.startsWith('.')) {
			const directory = path.dirname(filename);
			const key = `r:${directory}\0${specifier}`;
			const cached = caches.import.get(key);
			if (cached !== undefined) return cached;
			const absolute = path.resolve(directory, specifier);
			const result = resolveCandidate(toRelative(absolute));
			caches.import.set(key, result);
			return result;
		}

		const key = `s:${specifier}`;
		const cached = caches.import.get(key);
		if (cached !== undefined) return cached;

		/** @type {string | null} */
		let result = null;
		if (specifier === '#lib') result = resolveCandidate('src/lib/index.ts');
		else if (specifier.startsWith('#lib/')) result = resolveCandidate(`src/${specifier.slice(1)}`);
		else if (specifier.startsWith('#frontend/')) {
			result = resolveCandidate(`src/lib/${specifier.slice(1)}`);
		} else if (specifier === '#db') result = resolveCandidate('src/lib/server/db/index.ts');
		else if (specifier.startsWith('#db/')) {
			result = resolveCandidate(`src/lib/server/db/${specifier.slice(4)}`);
		} else if (specifier.startsWith('#modules/')) {
			result = resolveCandidate(`src/lib/modules/${specifier.slice(9)}`);
		} else if (specifier === '#modules') result = resolveCandidate('src/lib/modules/index.ts');
		else if (specifier.startsWith('#shared/')) {
			result = resolveCandidate(`src/lib/shared/${specifier.slice(8)}`);
		} else if (specifier === '#shared') result = resolveCandidate('src/lib/shared/index.ts');
		else if (specifier === '$lib') result = resolveCandidate('src/lib/index.ts');
		else if (specifier.startsWith('$lib/'))
			result = resolveCandidate(`src/lib/${specifier.slice(5)}`);

		caches.import.set(key, result);
		return result;
	}

	/** @param {string} rel */
	function moduleChain(rel) {
		const cached = caches.chain.get(rel);
		if (cached !== undefined) return cached;

		const parts = rel.split('/');
		/** @type {string[] | null} */
		let chain = null;
		if (parts[0] === 'src' && parts[1] === 'lib' && parts[2] === 'modules' && parts.length >= 4) {
			chain = [parts[3]];
			let index = 4;
			while (index < parts.length) {
				if (parts[index] === 'modules' && index + 1 < parts.length) {
					chain.push(parts[index + 1]);
					index += 2;
				} else {
					index += 1;
				}
			}
		}

		caches.chain.set(rel, chain);
		return chain;
	}

	/** @param {string[]} chain */
	function moduleBase(chain) {
		const key = chain.join('/');
		const cached = caches.base.get(key);
		if (cached !== undefined) return cached;

		let base = MODULE_ROOT;
		for (let index = 0; index < chain.length; index += 1) {
			base += index === 0 ? `/${chain[0]}` : `/modules/${chain[index]}`;
		}

		caches.base.set(key, base);
		return base;
	}

	/**
	 * @param {string} rel
	 * @param {string[]} chain
	 */
	function isModuleEntry(rel, chain) {
		const base = moduleBase(chain);
		return rel === `${base}/index.ts` || rel === `${base}/server.ts`;
	}

	/**
	 * @param {string} rel
	 * @param {string[]} chain
	 */
	function isModuleIndex(rel, chain) {
		return rel === `${moduleBase(chain)}/index.ts`;
	}

	/**
	 * @param {string[]} prefix
	 * @param {string[]} value
	 */
	function isPrefix(prefix, value) {
		return (
			prefix.length <= value.length && prefix.every((segment, index) => segment === value[index])
		);
	}

	/**
	 * @param {string[]} left
	 * @param {string[]} right
	 */
	function sameChain(left, right) {
		return left.length === right.length && left.every((segment, index) => segment === right[index]);
	}

	/**
	 * Classifies two module chains in a single pass.
	 *
	 * @param {string[]} source
	 * @param {string[]} target
	 * @returns {'same' | 'ancestor' | 'descendant' | 'sibling'}
	 */
	function relation(source, target) {
		const shared = Math.min(source.length, target.length);
		for (let index = 0; index < shared; index += 1) {
			if (source[index] !== target[index]) return 'sibling';
		}
		if (source.length === target.length) return 'same';
		return source.length < target.length ? 'ancestor' : 'descendant';
	}

	/**
	 * @param {string} rel
	 * @param {string[]} chain
	 */
	function layerOf(rel, chain) {
		const cached = caches.layer.get(rel);
		if (cached !== undefined) return cached;

		const base = moduleBase(chain);
		const rest = rel.slice(base.length + 1);
		/** @type {string} */
		let layer = 'entry';
		if (rest.startsWith('domain/')) layer = 'domain';
		else if (rest.startsWith('application/')) layer = 'application';
		else if (rest.startsWith('infra/pg/')) layer = 'pg';
		else if (rest.startsWith('infra/sqlite/')) layer = 'sqlite';
		else if (rest.startsWith('infra/')) layer = 'infra';
		else if (rest.startsWith('ui/')) layer = 'ui';

		caches.layer.set(rel, layer);
		return layer;
	}

	/** @param {string} rel */
	function isServerFile(rel) {
		const base = rel.split('/').pop() ?? '';
		return base === 'server.ts' || base.endsWith('.server.ts');
	}

	/** @param {string} specifier */
	function isFramework(specifier) {
		return FRAMEWORK.test(specifier);
	}

	/** @param {string} specifier */
	function isPureForbidden(specifier) {
		return PURE_FORBIDDEN.test(specifier);
	}

	/** @param {string} rel */
	function schemaDialect(rel) {
		if (rel.endsWith('/infra/pg/schema.ts')) return 'pg';
		if (rel.endsWith('/infra/sqlite/schema.ts')) return 'sqlite';
		return null;
	}

	/** @param {string} rel */
	function isSchemaAggregator(rel) {
		return rel === 'src/lib/server/db/schema.pg.ts' || rel === 'src/lib/server/db/schema.sqlite.ts';
	}

	/** @param {string} rel */
	function isAppRoot(rel) {
		return (
			rel === 'src/hooks.server.ts' ||
			rel === 'src/hooks.client.ts' ||
			rel === 'src/lib/server/db/index.ts'
		);
	}

	/** @param {string} rel */
	function isRoute(rel) {
		return rel.startsWith('src/routes/');
	}

	/** @param {string} rel */
	function isShared(rel) {
		return rel.startsWith('src/lib/shared/');
	}

	/**
	 * @param {string} rel
	 * @returns {FileMeta}
	 */
	function getMeta(rel) {
		const cached = caches.meta.get(rel);
		if (cached !== undefined) return cached;

		const chain = moduleChain(rel);
		const base = chain ? moduleBase(chain) : null;
		/** @type {FileMeta} */
		const meta = {
			chain,
			base,
			layer: chain ? layerOf(rel, chain) : null,
			isRoute: isRoute(rel),
			isShared: isShared(rel),
			isAggregator: isSchemaAggregator(rel),
			isAppRoot: isAppRoot(rel),
			isIndex: base !== null && rel === `${base}/index.ts`,
			isEntry: base !== null && (rel === `${base}/index.ts` || rel === `${base}/server.ts`),
			isServer: isServerFile(rel),
			dialect: schemaDialect(rel)
		};

		caches.meta.set(rel, meta);
		return meta;
	}

	function clearCaches() {
		for (const map of Object.values(caches)) map.clear();
	}

	return {
		root,
		moduleRoot: MODULE_ROOT,
		toRelative,
		isFile,
		resolveCandidate,
		resolveImport,
		moduleChain,
		moduleBase,
		isModuleEntry,
		isModuleIndex,
		isPrefix,
		sameChain,
		relation,
		layerOf,
		isServerFile,
		isFramework,
		isPureForbidden,
		schemaDialect,
		isSchemaAggregator,
		isAppRoot,
		isRoute,
		isShared,
		getMeta,
		clearCaches
	};
}
