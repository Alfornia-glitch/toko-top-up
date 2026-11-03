<script lang="ts">
	import { cn } from '#lib/frontend/utils.ts';

	let {
		image = null,
		name = null,
		email = null,
		class: className = '',
		labelClass = 'text-sm'
	}: {
		image?: string | null;
		name?: string | null;
		email?: string | null;
		class?: string;
		labelClass?: string;
	} = $props();

	const displayName = $derived(name?.trim() || email?.trim() || 'Account');
	const initials = $derived(
		displayName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('')
	);
</script>

<div
	class={cn(
		'relative shrink-0 overflow-clip rounded-[10px] border border-solid border-[#e5e5e5]',
		className
	)}
	data-name="Avatar"
>
	<div class="absolute inset-[-1px]" data-name="pic">
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			{#if image}
				<img
					src={image}
					alt={displayName}
					class="absolute inset-0 block size-full max-w-none object-cover"
				/>
			{:else}
				<div
					class={cn(
						"absolute inset-0 flex items-center justify-center bg-[#f5f5f5] font-['Geist:SemiBold'] font-semibold text-[#737373]",
						labelClass
					)}
					aria-hidden="true"
				>
					{initials || '?'}
				</div>
			{/if}
		</div>
	</div>
</div>
