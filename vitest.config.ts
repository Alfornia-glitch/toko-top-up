import { svelte } from '@sveltejs/vite-plugin-svelte';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [paraglideVitePlugin({ project: './project.inlang' }), svelte()],
	resolve: {
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{ts,js}', 'test/**/*.{test,spec}.{ts,js}'],
		setupFiles: ['test/setup.ts'],
		globalSetup: ['test/global-setup.ts'],
		fileParallelism: false,
		restoreMocks: true,
		clearMocks: true
	}
});
