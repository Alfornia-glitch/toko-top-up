<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Pagination as PaginationPrimitive } from 'bits-ui';
	import { cn } from '#lib/frontend/utils.ts';

	let {
		ref = $bindable(null),
		class: className,
		count = 0,
		perPage = 10,
		page = $bindable(1),
		siblingCount = 1,
		...restProps
	}: PaginationPrimitive.RootProps = $props();
</script>

<PaginationPrimitive.Root
	bind:ref
	bind:page
	role="navigation"
	aria-label={m.ui_pagination_label()}
	data-slot="pagination"
	{count}
	{perPage}
	{siblingCount}
	class={cn('mx-auto flex w-full justify-center', className)}
	{...restProps}
/>
