<script lang="ts">
	import type { Snippet } from 'svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import AccountPageHeader from './AccountPageHeader.svelte';

	let {
		title = '',
		description,
		actions,
		children,
		narrow = false
	}: {
		title?: string;
		description?: string;
		actions?: Snippet;
		children: Snippet;
		narrow?: boolean;
	} = $props();
</script>

<div class="flex min-h-screen w-full flex-col bg-background text-foreground">
	<SiteHeader />
	<main class="flex w-full flex-1 justify-center bg-white px-4 py-10 sm:px-8 sm:py-14">
		<div
			class={[
				'flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-8',
				narrow ? 'max-w-[1080px]' : 'max-w-[1280px]'
			]}
		>
			<AccountSidebar />
			<section class="flex min-w-0 flex-1 flex-col gap-6">
				{#if title || description || actions}
					<AccountPageHeader {title} {description} {actions} />
				{/if}
				{@render children()}
			</section>
		</div>
	</main>
	<SiteFooter />
</div>
