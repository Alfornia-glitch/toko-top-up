<script lang="ts">
	import type { Snippet } from 'svelte';
	import RequireRole from '#lib/frontend/components/admin/RequireRole.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<RequireRole role="superadmin">
	{@render children()}
</RequireRole>
