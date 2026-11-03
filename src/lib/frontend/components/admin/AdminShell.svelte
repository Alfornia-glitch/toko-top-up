<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as Sidebar from '#lib/frontend/components/ui/sidebar/index.ts';
	import AdminSidebar from './AdminSidebar.svelte';
	import AdminHeader from './AdminHeader.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<Sidebar.Provider>
	<AdminSidebar />
	<Sidebar.Inset>
		<AdminHeader />
		<main class="flex-1 overflow-auto p-4 md:p-6">
			<div class="mx-auto w-full max-w-7xl">
				{@render children()}
			</div>
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
