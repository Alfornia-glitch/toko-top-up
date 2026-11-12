<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { LoaderCircle } from '@lucide/svelte';
	import ProductForm from '#lib/frontend/components/admin/catalog/ProductForm.svelte';
	import type {
		AdminProductDetail,
		CatalogBrandOption,
		CatalogCategoryOption
	} from '#lib/frontend/components/admin/catalog/ProductForm.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';

	let product = $state<AdminProductDetail | null>(null);
	let categories = $state<CatalogCategoryOption[]>([]);
	let brands = $state<CatalogBrandOption[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(() => {
		void load(page.params.id);
	});

	async function load(id: string | undefined) {
		if (!id) {
			error = 'Product not found.';
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const [productResponse, categoryResponse, brandResponse] = await Promise.all([
				fetch(`/api/admin/products/${id}`),
				fetch('/api/admin/categories'),
				fetch('/api/admin/brands')
			]);
			const [productPayload, categoryPayload, brandPayload] = await Promise.all([
				productResponse.json().catch(() => ({})),
				categoryResponse.json().catch(() => ({})),
				brandResponse.json().catch(() => ({}))
			]);

			if (!productResponse.ok) {
				throw new Error(productPayload.error ?? 'Could not load product');
			}

			if (!categoryResponse.ok) {
				throw new Error(categoryPayload.error ?? 'Could not load categories');
			}

			if (!brandResponse.ok) {
				throw new Error(brandPayload.error ?? 'Could not load brands');
			}

			product = productPayload.data as AdminProductDetail;
			categories = (categoryPayload.data ?? []).map(
				(row: { id: string; name: string; parentName?: string | null }) => ({
					id: row.id,
					name: row.name,
					parentName: row.parentName ?? null
				})
			);
			brands = (brandPayload.data ?? []).map((row: { id: string; name: string }) => ({
				id: row.id,
				name: row.name
			}));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load product';
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
	</div>
{:else if error}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-destructive">{error}</p>
			<div class="flex justify-center gap-2">
				<Button variant="outline" href="/admin/products">Back to products</Button>
				<Button onclick={() => void load(page.params.id)}>Try again</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if product}
	<ProductForm {product} {categories} {brands} />
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">This product could not be found.</p>
			<Button href="/admin/products">Back to products</Button>
		</Card.Content>
	</Card.Root>
{/if}
