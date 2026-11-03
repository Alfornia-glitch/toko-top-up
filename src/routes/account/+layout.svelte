<script lang="ts">
	import type { Snippet } from 'svelte';
	import RequireAuth from '#lib/frontend/components/auth/RequireAuth.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<RequireAuth>{@render children()}</RequireAuth>
