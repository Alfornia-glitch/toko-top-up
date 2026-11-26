<script lang="ts">
	import { onMount } from 'svelte';
	import DealCountdown from '#lib/frontend/components/storefront/DealCountdown.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	let { menu, close }: { menu: 'shops' | 'deals' | 'new'; close: () => void } = $props();

	onMount(() => {
		void home.ensure();
	});

	const promo = $derived(
		menu === 'deals'
			? {
					title: 'Today’s deals',
					text: 'Limited-time offers on selected products.',
					href: '/products?deal=true',
					cta: 'See all deals',
					tone: 'bg-sky-50'
				}
			: menu === 'new'
				? {
						title: 'New arrivals',
						text: 'The latest products, fresh in the store.',
						href: '/products?newArrival=true',
						cta: 'See what’s new',
						tone: 'bg-emerald-50'
					}
				: {
						title: 'Shop by category',
						text: 'Browse everything we have to offer.',
						href: '/products',
						cta: 'View all products',
						tone: 'bg-muted'
					}
	);

	const columns = $derived(
		home.categories
			.filter((category) => category.parentId === null)
			.slice(0, 6)
			.map((root) => ({
				root: { label: root.name, href: `/products?categoryId=${encodeURIComponent(root.id)}` },
				children: home.categories
					.filter((category) => category.parentId === root.id)
					.slice(0, 9)
					.map((child) => ({
						label: child.name,
						href: `/products?categoryId=${encodeURIComponent(child.id)}`
					}))
			}))
	);
</script>

<div
	class="absolute inset-x-0 top-full z-50 border-b bg-background shadow-lg"
	role="presentation"
	onmouseleave={close}
>
	<div
		class="mx-auto grid max-h-[80vh] max-w-7xl gap-8 overflow-y-auto px-8 py-6 md:grid-cols-[2fr_1fr]"
	>
		{#if columns.length > 0}
			<div class="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-3">
				{#each columns as column (column.root.href)}
					<div class="flex flex-col gap-2 text-sm">
						<a
							href={column.root.href}
							onclick={close}
							class="font-medium text-foreground hover:underline"
						>
							{column.root.label}
						</a>
						{#each column.children as child (child.href)}
							<a
								href={child.href}
								onclick={close}
								class="text-muted-foreground transition-colors hover:text-foreground"
							>
								{child.label}
							</a>
						{/each}
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-muted-foreground">
				{home.loading ? 'Loading categories…' : 'No categories yet.'}
			</p>
		{/if}

		<div class="flex flex-col items-start gap-3 rounded-xl p-6 {promo.tone}">
			<h2 class="text-xl font-semibold">{promo.title}</h2>
			<p class="text-sm text-muted-foreground">{promo.text}</p>
			{#if menu === 'deals' && home.deals.length > 0}
				<DealCountdown endsAt={home.deals[0]?.dealEndsAt} />
			{/if}
			<a
				href={promo.href}
				onclick={close}
				class="mt-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
			>
				{promo.cta} →
			</a>
		</div>
	</div>
</div>
