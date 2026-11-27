<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { LoaderCircle } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
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
			error = m.admin_catalog_products_not_found();
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
				throw new Error(errorMessage(productPayload, 'admin_catalog_products_load_product_failed'));
			}

			if (!categoryResponse.ok) {
				throw new Error(
					errorMessage(categoryPayload, 'admin_catalog_products_load_categories_failed')
				);
			}

			if (!brandResponse.ok) {
				throw new Error(errorMessage(brandPayload, 'admin_catalog_products_load_brands_failed'));
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
			error = errorMessage(err, 'admin_catalog_products_load_product_failed');
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
				<Button variant="outline" href="/admin/products">{m.admin_catalog_products_back()}</Button>
				<Button onclick={() => void load(page.params.id)}>{m.common_retry()}</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if product}
	<ProductForm {product} {categories} {brands} />
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">{m.admin_catalog_products_could_not_be_found()}</p>
			<Button href="/admin/products">{m.admin_catalog_products_back()}</Button>
		</Card.Content>
	</Card.Root>
{/if}
