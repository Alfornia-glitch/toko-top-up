<script lang="ts">
	import type { Component } from 'svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { cn } from '#lib/frontend/utils.ts';

	let {
		title,
		value,
		hint,
		icon: Icon,
		class: className
	}: {
		title: string;
		value: string | number;
		hint?: string;
		icon?: Component<{ class?: string }>;
		class?: string;
	} = $props();
</script>

<Card.Root class={cn('gap-2 py-4', className)}>
	<Card.Header class="flex flex-row items-center justify-between space-y-0">
		<Card.Description class="text-sm font-medium">{title}</Card.Description>
		{#if Icon}
			<Icon class="size-4 text-muted-foreground" />
		{/if}
	</Card.Header>
	<Card.Content>
		<div class="text-2xl font-semibold tracking-tight">{value}</div>
		{#if hint}
			<p class="text-xs text-muted-foreground">{hint}</p>
		{/if}
	</Card.Content>
</Card.Root>
