<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import Seo from '#lib/frontend/components/Seo.svelte';
	import { categoryMeta } from '#lib/frontend/modules/seo/index.ts';
	import ProductGridSidebar from '#lib/frontend/pages/ProductGridSidebar.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import * as Breadcrumb from '#lib/frontend/components/ui/breadcrumb/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const slug = $derived((page.params as { slug?: string }).slug);
	const category = $derived(home.categories.find((item) => item.slug === slug));
	const children = $derived(home.categories.filter((item) => item.parentId === category?.id));

	onMount(() => {
		void home.ensure();
	});
</script>

{#if category}
	<Seo meta={categoryMeta(category)} />
{/if}

{#if home.loading && !home.data}
	<div
		class="relative flex size-full flex-col content-stretch items-center bg-white"
		data-name="Shopix - Category"
	>
		<SiteHeader />
		<div class="mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-8">
			<Skeleton class="mb-6 h-5 w-64" />
			<Skeleton class="mb-8 h-[220px] w-full rounded-[14px]" />
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each [0, 1, 2, 3, 4, 5] as item (item)}
					<Skeleton class="h-[320px] w-full rounded-[14px]" />
				{/each}
			</div>
		</div>
		<SiteFooter />
	</div>
{:else if !category}
	<div
		class="relative flex size-full flex-col content-stretch items-center bg-white"
		data-name="Shopix - Category"
	>
		<SiteHeader />
		<div class="flex min-h-[60vh] w-full items-center justify-center px-4 py-16">
			<Card.Root class="w-full max-w-lg">
				<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
					<p class="text-lg font-semibold text-[#0a0a0a]">Category not found</p>
					<p class="text-sm text-muted-foreground">
						The category you are looking for does not exist or is no longer available.
					</p>
					<Button href="/categories">Browse categories</Button>
				</Card.Content>
			</Card.Root>
		</div>
		<SiteFooter />
	</div>
{:else}
	<ProductGridSidebar
		query={{ categoryId: category.id }}
		basePath={`/categories/${category.slug}`}
		lockedCategoryId={category.id}
	>
		{#snippet before()}
			<div class="flex w-full flex-col gap-6 pt-8">
				<div class="mx-auto w-full max-w-[1280px] px-[32px]">
					<Breadcrumb.Root>
						<Breadcrumb.List>
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Link href="/categories">Categories</Breadcrumb.Link>
							</Breadcrumb.Item>
							<Breadcrumb.Separator />
							<Breadcrumb.Item>
								<Breadcrumb.Page>{category.name}</Breadcrumb.Page>
							</Breadcrumb.Item>
						</Breadcrumb.List>
					</Breadcrumb.Root>
				</div>
				<div class="mx-auto w-full max-w-[1280px] px-[32px]">
					<div
						class="grid gap-6 overflow-hidden rounded-[14px] border bg-[#f5f5f5] p-6 sm:p-10 md:grid-cols-[1.2fr_1fr]"
					>
						<div class="flex flex-col items-start gap-4">
							<h1 class="text-3xl font-bold text-[#0a0a0a] sm:text-4xl">{category.name}</h1>
							{#if category.description}
								<p class="text-muted-foreground">{category.description}</p>
							{/if}
							<Badge variant="secondary">{category.productCount} products</Badge>
							{#if children.length > 0}
								<div class="flex flex-wrap gap-2">
									{#each children as child (child.id)}
										<Button variant="outline" size="sm" href={`/categories/${child.slug}`}>
											{child.name}
										</Button>
									{/each}
								</div>
							{/if}
							<Button variant="link" href="/categories" class="px-0">Back to all categories</Button>
						</div>
						<div class="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
							{#if category.imageUrl}
								<img
									src={category.imageUrl}
									alt={category.name}
									loading="lazy"
									class="size-full object-cover"
								/>
							{:else}
								<ImagePlaceholder class="size-full" label={category.name} />
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/snippet}
	</ProductGridSidebar>
{/if}
