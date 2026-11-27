<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { cn } from '#lib/frontend/utils.ts';
	import { useSidebar } from './context.svelte.ts';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		onclick,
		...restProps
	}: ComponentProps<typeof Button> & {
		onclick?: (e: MouseEvent) => void;
	} = $props();

	const sidebar = useSidebar();
</script>

<Button
	bind:ref
	data-sidebar="trigger"
	data-slot="sidebar-trigger"
	variant="ghost"
	size="icon-sm"
	class={cn(className)}
	type="button"
	onclick={(e) => {
		onclick?.(e);
		sidebar.toggle();
	}}
	{...restProps}
>
	<PanelLeftIcon class="cn-rtl-flip" />
	<span class="sr-only">{m.ui_sidebar_toggle()}</span>
</Button>
