<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { cn } from '#lib/frontend/utils.ts';
	import { buttonVariants } from '../button/index.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: PaginationPrimitive.NextButtonProps = $props();
</script>

{#snippet Fallback()}
	<span>{m.common_next()}</span>
	<ChevronRightIcon class={cn('cn-rtl-flip size-4', className)} />
{/snippet}

<PaginationPrimitive.NextButton
	bind:ref
	aria-label={m.ui_pagination_go_next()}
	class={cn(buttonVariants({ variant: 'ghost' }), 'pr-1.5!', className)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</PaginationPrimitive.NextButton>
