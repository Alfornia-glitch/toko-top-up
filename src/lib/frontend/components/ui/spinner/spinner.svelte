<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';
	import { cn } from '#lib/frontend/utils.ts';

	let {
		class: className,
		role = 'status',
		'aria-label': ariaLabel
	}: { class?: string; role?: string; 'aria-label'?: string } = $props();
</script>

<Loader2Icon
	{role}
	aria-label={ariaLabel ?? m.common_loading()}
	class={cn('size-4 animate-spin', className)}
/>
