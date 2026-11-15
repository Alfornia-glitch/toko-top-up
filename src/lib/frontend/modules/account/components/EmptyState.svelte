<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		icon,
		action
	}: {
		title: string;
		description?: string;
		icon?: Snippet;
		action?: Snippet;
	} = $props();
</script>

<div
	class="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-center sm:p-12"
>
	{#if icon}
		<div
			class="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"
		>
			{@render icon()}
		</div>
	{/if}
	<div class="flex flex-col gap-1">
		<p class="text-base font-semibold text-foreground">{title}</p>
		{#if description}
			<p class="text-sm text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if action}
		<div class="mt-1">
			{@render action()}
		</div>
	{/if}
</div>
