/** @type {import("dependency-cruiser").IConfiguration} */
const config = {
	forbidden: [
		{
			name: 'no-circular',
			severity: 'error',
			comment: 'Circular dependencies break the module graph.',
			from: {},
			to: { circular: true }
		},
		{
			name: 'no-orphans',
			severity: 'error',
			comment: 'Every module file must be reachable from an entry point.',
			from: {
				orphan: true,
				path: '^src/lib/modules/',
				pathNot: ['\\.d\\.ts$', '\\.svelte$']
			},
			to: {}
		},
		{
			name: 'outside-modules-only-public-entries',
			severity: 'error',
			comment: "Code outside modules may import only a top-level module's index.ts or server.ts.",
			from: {
				pathNot: ['^src/lib/modules/', '^src/lib/server/db/schema\\.(pg|sqlite)\\.ts$']
			},
			to: {
				path: '^src/lib/modules/',
				pathNot: '^src/lib/modules/[^/]+/(index|server)\\.ts$'
			}
		},
		{
			name: 'routes-only-module-entries',
			severity: 'error',
			comment: 'Routes must not reach past module entry points.',
			from: { path: '^src/routes/' },
			to: {
				path: '^src/lib/modules/',
				pathNot: '^src/lib/modules/[^/]+/(index|server)\\.ts$'
			}
		},
		{
			name: 'module-index-no-server',
			severity: 'error',
			comment: 'index.ts must not pull in server.ts or *.server.ts.',
			from: { path: '^src/lib/modules/.+/index\\.ts$' },
			to: { path: '(^|/)(server\\.ts|[^/]+\\.server\\.ts)$' }
		},
		{
			name: 'shared-no-modules',
			severity: 'error',
			comment: 'The shared kernel must not depend on modules.',
			from: { path: '^src/lib/shared/' },
			to: { path: '^src/lib/modules/' }
		},
		{
			name: 'domain-pure',
			severity: 'error',
			comment: 'Domain code may not depend on frameworks, adapters, or outer layers.',
			from: { path: '/domain/' },
			to: {
				path: '/(application|infra|ui)/|^drizzle-orm|^better-auth|^@supabase|^svelte|^\\$app|^\\$env'
			}
		},
		{
			name: 'application-no-infra',
			severity: 'error',
			comment: 'Application code talks to ports, never to adapters.',
			from: { path: '/application/' },
			to: { path: '/infra/' }
		},
		{
			name: 'pg-no-sqlite',
			severity: 'error',
			comment: 'Postgres and SQLite adapters stay isolated.',
			from: { path: '/infra/pg/' },
			to: { path: '/infra/sqlite/' }
		},
		{
			name: 'sqlite-no-pg',
			severity: 'error',
			comment: 'SQLite and Postgres adapters stay isolated.',
			from: { path: '/infra/sqlite/' },
			to: { path: '/infra/pg/' }
		}
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		exclude: {
			path: [
				'(^|/)node_modules/',
				'\\.svelte-kit/',
				'^build/',
				'^static/',
				'^tools/',
				'^scripts/',
				'^e2e/'
			]
		},
		tsConfig: { fileName: 'tsconfig.json' },
		tsPreCompilationDeps: true,
		enhancedResolveOptions: {
			exportsFields: ['exports'],
			conditionNames: ['import', 'require', 'node', 'default']
		},
		reporterOptions: {
			dot: { collapsePattern: 'node_modules/[^/]+' }
		}
	}
};

export default config;
