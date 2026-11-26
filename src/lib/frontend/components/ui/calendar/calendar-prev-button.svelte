<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Calendar as CalendarPrimitive } from 'bits-ui';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { buttonVariants, type ButtonVariant } from '#lib/frontend/components/ui/button/index.ts';
	import { cn } from '#lib/frontend/utils.ts';

	let {
		ref = $bindable(null),
		class: className,
		children,
		variant = 'ghost',
		...restProps
	}: CalendarPrimitive.PrevButtonProps & {
		variant?: ButtonVariant;
	} = $props();
</script>

{#snippet Fallback()}
	<ChevronLeftIcon class={cn('cn-rtl-flip size-4', className)} />
{/snippet}

<CalendarPrimitive.PrevButton
	bind:ref
	aria-label={m.ui_calendar_previous_month()}
	class={cn(
		buttonVariants({ variant }),
		'size-(--cell-size) bg-transparent p-0 select-none disabled:opacity-50',
		'rtl:rotate-180',
		className
	)}
	{...restProps}
>
	{#if children}
		{@render children?.()}
	{:else}
		{@render Fallback()}
	{/if}
</CalendarPrimitive.PrevButton>
