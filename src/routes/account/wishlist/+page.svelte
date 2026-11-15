<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Heart } from '@lucide/svelte';
	import AccountPageShell from '#lib/frontend/modules/account/components/AccountPageShell.svelte';
	import { EmptyState, wishlist, isUnauthorized } from '#lib/frontend/modules/account/index.ts';
	import StorefrontProductCard from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { formatDate } from '#lib/frontend/modules/commerce/format.ts';

	let loading = $state(true);
	let error = $state('');

	function redirectToLogin(): void {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	onMount(() => {
		void wishlist
			.refresh()
			.catch((cause) => {
				if (isUnauthorized(cause)) {
					redirectToLogin();
				} else {
					error = cause instanceof Error ? cause.message : 'Could not load your wishlist.';
				}
			})
			.finally(() => {
				loading = false;
			});
	});
</script>

<AccountPageShell title="My wishlist" description="Products you saved for later.">
	{#snippet actions()}
		<span class="text-sm text-muted-foreground">{wishlist.count} saved products</span>
		<Button variant="outline" href="/account">Back to account</Button>
	{/snippet}

	{#if loading}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
			{#each Array.from({ length: 6 }, (_, index) => index) as index (index)}
				<div class="flex flex-col gap-3">
					<Skeleton class="aspect-square w-full rounded-[14px]" />
					<Skeleton class="h-4 w-2/3" />
					<Skeleton class="h-4 w-1/3" />
				</div>
			{/each}
		</div>
	{:else if error}
		<div
			role="alert"
			class="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{error}
		</div>
	{:else if wishlist.items.length === 0}
		<EmptyState
			title="Your wishlist is empty"
			description="Save products you love and find them here later."
		>
			{#snippet icon()}
				<Heart class="size-5" />
			{/snippet}
			{#snippet action()}
				<Button href="/products">Browse products</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
			{#each wishlist.items as item (item.id)}
				<div class="flex h-full flex-col gap-3">
					<div class="min-h-0 flex-1">
						<StorefrontProductCard product={item} />
					</div>
					<div class="flex items-center gap-2">
						<Badge variant="secondary">Saved {formatDate(item.wishlistedAt)}</Badge>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</AccountPageShell>
