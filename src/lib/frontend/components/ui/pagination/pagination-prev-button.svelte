<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { cn } from '#lib/frontend/utils.ts';
	import { buttonVariants } from '../button/index.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
	<ChevronLeftIcon class={cn('cn-rtl-flip size-4', className)} />
	<span>{m.common_previous()}</span>
{/snippet}

<PaginationPrimitive.PrevButton
	bind:ref
	aria-label={m.ui_pagination_go_previous()}
	class={cn(buttonVariants({ variant: 'ghost' }), 'pl-1.5!', className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</PaginationPrimitive.PrevButton>
