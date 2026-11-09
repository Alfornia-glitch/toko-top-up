import { createModuleBoundariesCore } from './module-boundaries-core.js';

const core = createModuleBoundariesCore(process.cwd());

export const resolveImport = core.resolveImport;
export const moduleChain = core.moduleChain;
export const clearModuleBoundariesCaches = core.clearCaches;

const rule = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforces recursive module boundaries, layer purity, and public entry points.'
		},
		schema: [],
		messages: {
			ancestor:
				"An ancestor module may not import a descendant module. Only the direct parent may import a child's index.ts or server.ts.",
			ancestorDeep:
				"An ancestor may only import the direct child's index.ts or server.ts, not a deeper descendant.",
			descendant: 'A module may not import an ancestor module.',
			privateNested:
				"Module '{{target}}' is nested; it is private to its parent. Only its direct parent may import its index.ts or server.ts.",
			deepImport:
				"Only a module's index.ts or server.ts is public. Deep import '{{target}}' is forbidden.",
			indexServer: 'An index.ts entry point may not import server.ts or *.server.ts files.',
			domainPurity: "Domain must stay pure; '{{specifier}}' is not allowed.",
			applicationServer:
				"Application may not import server-only code; '{{specifier}}' is not allowed.",
			applicationInfra: 'Application may not import infrastructure.',
			dialect: 'Postgres and SQLite adapters must not import each other.',
			sharedModule: 'Shared may not import modules.',
			schemaAggregator:
				'Only the database schema aggregator may import module infrastructure schemas.',
			routeDeep: 'Routes may import only top-level module entries (index.ts/server.ts) and shared.',
			appRootDeep: 'The application root may import only top-level module entries and shared.'
		}
	},

	/** @param {import("eslint").Rule.RuleContext} context */
	create(context) {
		const filename = context.filename;
		const rel = core.toRelative(filename);
		if (rel.startsWith('..')) return {};

		const sourceMeta = core.getMeta(rel);
		if (
			!sourceMeta.chain &&
			!sourceMeta.isRoute &&
			!sourceMeta.isShared &&
			!sourceMeta.isAggregator &&
			!sourceMeta.isAppRoot
		) {
			return {};
		}

		const sourceChain = sourceMeta.chain;
		const sourceLayer = sourceMeta.layer;
		const sourceIsRoute = sourceMeta.isRoute;
		const sourceIsShared = sourceMeta.isShared;
		const sourceIsAggregator = sourceMeta.isAggregator;
		const sourceIsAppRoot = sourceMeta.isAppRoot;
		const sourceIsIndex = sourceMeta.isIndex;

		/**
		 * @param {import("estree").Node} node
		 * @param {string} messageId
		 * @param {Record<string, string>} [data]
		 */
		function report(node, messageId, data) {
			context.report({ node, messageId, data });
		}

		/**
		 * @param {unknown} specifier
		 * @param {import("estree").Node} node
		 */
		function check(specifier, node) {
			if (typeof specifier !== 'string' || !specifier) return;
			if (sourceLayer === 'domain' && core.isPureForbidden(specifier)) {
				report(node, 'domainPurity', { specifier });
				return;
			}
			if (core.isFramework(specifier)) {
				if (sourceLayer === 'domain') {
					report(node, 'domainPurity', { specifier });
				}
				return;
			}
			if (sourceLayer === 'application' && core.isServerOnly(specifier)) {
				report(node, 'applicationServer', { specifier });
				return;
			}

			const first = specifier.charCodeAt(0);
			if (first !== 46 && first !== 35 && first !== 36) return;

			const target = core.resolveImport(specifier, filename);
			if (!target) return;

			const targetMeta = core.getMeta(target);
			const targetChain = targetMeta.chain;
			const targetLayer = targetMeta.layer;

			if (sourceIsShared && targetChain) {
				report(node, 'sharedModule', { target: targetChain.join('/') });
				return;
			}

			if (targetChain && sourceChain && targetMeta.dialect && !sourceIsAggregator) {
				const sameModule = core.sameChain(targetChain, sourceChain);
				if (!sameModule) {
					report(node, 'schemaAggregator', { target: targetChain.join('/') });
					return;
				}
			}

			if (sourceChain && targetChain) {
				if (sourceLayer === 'domain') {
					report(node, 'domainPurity', { specifier });
					return;
				}
				if (sourceLayer === 'application' && targetLayer && targetLayer !== 'entry') {
					if (
						targetLayer === 'infra' ||
						targetLayer === 'pg' ||
						targetLayer === 'sqlite' ||
						targetLayer === 'ui'
					) {
						report(node, 'applicationInfra');
						return;
					}
				}
				if (
					(sourceLayer === 'pg' && targetLayer === 'sqlite') ||
					(sourceLayer === 'sqlite' && targetLayer === 'pg')
				) {
					report(node, 'dialect');
					return;
				}
				if (sourceIsIndex && targetMeta.isServer) {
					report(node, 'indexServer');
					return;
				}

				const kind = core.relation(sourceChain, targetChain);
				if (kind === 'same') return;

				if (kind === 'descendant') {
					report(node, 'descendant');
					return;
				}
				if (kind === 'ancestor') {
					const depth = targetChain.length - sourceChain.length;
					if (depth === 1 && targetMeta.isEntry) return;
					if (depth === 1) {
						report(node, 'deepImport', { target: targetChain.join('/') });
						return;
					}
					report(node, 'ancestorDeep');
					return;
				}

				if (targetChain.length === 1 && targetMeta.isEntry) return;
				report(node, 'privateNested', { target: targetChain.join('/') });
				return;
			}

			if (sourceIsRoute && targetChain) {
				if (targetChain.length === 1 && targetMeta.isEntry) return;
				report(node, 'routeDeep');
				return;
			}

			if (sourceIsAppRoot && targetChain) {
				if (targetChain.length === 1 && targetMeta.isEntry) return;
				report(node, 'appRootDeep');
			}
		}

		return {
			/** @param {import("estree").ImportDeclaration} node */
			ImportDeclaration(node) {
				check(node.source?.value, node);
			},
			/** @param {import("estree").ExportNamedDeclaration} node */
			ExportNamedDeclaration(node) {
				check(node.source?.value, node);
			},
			/** @param {import("estree").ExportAllDeclaration} node */
			ExportAllDeclaration(node) {
				check(node.source?.value, node);
			},
			/** @param {import("estree").ImportExpression} node */
			ImportExpression(node) {
				if (node.source?.type === 'Literal' && typeof node.source.value === 'string') {
					check(node.source.value, node);
				}
			}
		};
	}
};

export const moduleBoundariesPlugin = {
	meta: { name: 'local-module-boundaries', version: '0.0.0' },
	rules: { 'module-boundaries': rule }
};
