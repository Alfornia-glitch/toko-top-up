import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// Inline better-auth and its @better-auth/* packages so the deployed function never resolves
	// a second, mismatched copy of @better-auth/core at runtime.
	ssr: { noExternal: ['better-auth', /^@better-auth\//] },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			inspector: {
				toggleKeyCombo: 'alt-x',
				holdMode: false,
				showToggleButton: 'always',
				toggleButtonPos: 'bottom-right'
			}
		})
	]
});
