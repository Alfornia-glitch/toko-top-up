<script lang="ts">
	import type { Snippet } from 'svelte';
	import AdminShell from '#lib/frontend/components/admin/AdminShell.svelte';
	import RequireRole from '#lib/frontend/components/admin/RequireRole.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<RequireRole role="admin">
	<AdminShell>
		{@render children()}
	</AdminShell>
</RequireRole>
