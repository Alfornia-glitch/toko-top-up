<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { buttonVariants } from '#lib/frontend/components/ui/button/index.ts';
	import { cn } from '#lib/frontend/utils.ts';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: PaginationPrimitive.NextButtonProps = $props();
</script>

<PaginationPrimitive.NextButton
	bind:ref
	aria-label={m.ui_pagination_go_next()}
	class={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'pr-1.5!', className)}
	{...restProps}
>
	<span class="hidden sm:block">{m.common_next()}</span>
	<ChevronRightIcon data-icon="inline-end" class="cn-rtl-flip" />
</PaginationPrimitive.NextButton>
