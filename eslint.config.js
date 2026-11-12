import boundaries from 'eslint-plugin-boundaries';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';

import { moduleBoundariesPlugin } from './tools/eslint/module-boundaries.js';

const IGNORED = [
	'build/**',
	'.svelte-kit/**',
	'node_modules/**',
	'static/**',
	'tools/**',
	'scripts/**',
	'e2e/**'
];

const moduleTsFiles = ['src/lib/modules/**/*.ts', 'src/lib/shared/**/*.ts'];

/**
 * @param {import("eslint").Linter.Config[]} configs
 * @returns {import("eslint").Linter.Config[]}
 */
function scoped(configs) {
	return configs.map((config) => ({ ...config, files: moduleTsFiles }));
}

const boundariesSettings = {
	// Resolves the `#modules`, `#shared`, `#db` and `#lib` subpath imports from package.json.
	'import/resolver': { typescript: { project: './tsconfig.json' } },
	'boundaries/elements': [
		{ type: 'shared-ui', pattern: 'src/lib/shared/ui', partialMatch: false },
		{ type: 'shared', pattern: 'src/lib/shared', partialMatch: false },
		{ type: 'module', pattern: 'src/lib/modules', partialMatch: false },
		{ type: 'route', pattern: 'src/routes', partialMatch: false },
		{ type: 'db-schema', pattern: 'src/lib/server/db/schema', partialMatch: false },
		{ type: 'db', pattern: 'src/lib/server/db', partialMatch: false }
	],
	'boundaries/files': [
		{ pattern: 'src/hooks.server.ts', category: 'app-root' },
		{ pattern: 'src/hooks.client.ts', category: 'app-root' },
		{ pattern: 'src/lib/server/db/schema.pg.ts', category: 'db-aggregator' },
		{ pattern: 'src/lib/server/db/schema.sqlite.ts', category: 'db-aggregator' },
		{ pattern: 'src/lib/modules/**/infra/**', category: 'module-db-access' },
		{ pattern: 'src/lib/modules/**/server.ts', category: 'module-db-access' },
		{ pattern: 'src/lib/modules/**/module.server.ts', category: 'module-db-access' }
	]
};

const boundariesPolicy = {
	default: 'disallow',
	policies: [
		{
			from: { element: { type: 'shared-ui' } },
			allow: { to: { element: { types: ['shared-ui', 'shared'] } } }
		},
		{
			from: { element: { type: 'shared' } },
			allow: { to: { element: { type: 'shared' } } }
		},
		{
			from: { element: { type: 'module' } },
			allow: { to: { element: { types: ['module', 'shared', 'shared-ui'] } } }
		},
		{
			from: { file: { categories: 'module-db-access' } },
			allow: { to: { element: { types: ['db', 'db-schema'] } } }
		},
		{
			from: { file: { categories: 'db-aggregator' } },
			allow: { to: { element: { types: ['module', 'shared'] } } }
		},
		{
			from: { file: { categories: 'app-root' } },
			allow: {
				to: {
					element: { types: ['module', 'shared', 'shared-ui'] }
				}
			}
		},
		{
			from: { element: { type: 'route' } },
			allow: { to: { element: { types: ['module', 'shared', 'shared-ui'] } } }
		}
	],
	checkInternals: false
};

export default [
	{ ignores: IGNORED },
	tseslint.configs.base,
	...svelte.configs['flat/base'],
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: { parser: tseslint.parser }
		}
	},
	{
		// Svelte rune modules (`*.svelte.ts`) are TypeScript, not Svelte markup.
		files: ['**/*.svelte.ts'],
		languageOptions: { parser: tseslint.parser }
	},
	{
		files: ['**/*.{js,ts,svelte}'],
		plugins: { local: moduleBoundariesPlugin },
		rules: {
			'local/module-boundaries': 'error'
		}
	},
	{
		files: ['src/lib/modules/**/*.{js,ts,svelte}', 'src/lib/shared/**/*.{js,ts,svelte}'],
		plugins: { boundaries },
		settings: boundariesSettings,
		rules: {
			'boundaries/dependencies': ['error', boundariesPolicy],
			'boundaries/no-unknown-files': 'error',
			'boundaries/no-unknown-dependencies': 'error'
		}
	}
];
