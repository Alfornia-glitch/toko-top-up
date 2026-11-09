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
	'e2e/**',
	'src/lib/frontend/**',
	'src/lib/server/modules/**',
	'src/routes/**',
	'src/hooks.server.ts',
	'src/hooks.client.ts',
	'src/env.ts',
	'src/app.d.ts'
];

const boundariesSettings = {
	'boundaries/elements': [
		{ type: 'shared-ui', pattern: 'src/lib/shared/ui', partialMatch: false },
		{ type: 'shared', pattern: 'src/lib/shared', partialMatch: false },
		{ type: 'module', pattern: 'src/lib/modules', partialMatch: false },
		{ type: 'route', pattern: 'src/routes', partialMatch: false },
		{ type: 'app-root', pattern: 'src/hooks.server.ts', mode: 'file' },
		{ type: 'app-root', pattern: 'src/hooks.client.ts', mode: 'file' },
		{ type: 'db-aggregator', pattern: 'src/lib/server/db/schema.pg.ts', mode: 'file' },
		{ type: 'db-aggregator', pattern: 'src/lib/server/db/schema.sqlite.ts', mode: 'file' }
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
			from: { element: { type: 'db-aggregator' } },
			allow: { to: { element: { types: ['module', 'shared'] } } }
		},
		{
			from: { element: { type: 'app-root' } },
			allow: {
				to: {
					element: { types: ['module', 'shared', 'shared-ui', 'db-aggregator'] }
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
