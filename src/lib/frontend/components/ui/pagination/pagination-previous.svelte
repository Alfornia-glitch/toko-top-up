<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { buttonVariants } from '#lib/frontend/components/ui/button/index.ts';
	import { cn } from '#lib/frontend/utils.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: PaginationPrimitive.PrevButtonProps = $props();
</script>

<PaginationPrimitive.PrevButton
	bind:ref
	aria-label={m.ui_pagination_go_previous()}
	class={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'pl-1.5!', className)}
	{...restProps}
>
	<ChevronLeftIcon data-icon="inline-start" class="cn-rtl-flip" />
	<span class="hidden sm:block">{m.common_previous()}</span>
</PaginationPrimitive.PrevButton>
