<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { WithElementRef } from '#lib/frontend/utils.ts';
	import { cn } from '#lib/frontend/utils.ts';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<nav
	bind:this={ref}
	data-slot="breadcrumb"
	aria-label={m.ui_breadcrumb_label()}
	class={cn(className)}
	{...restProps}
>
	{@render children?.()}
</nav>
