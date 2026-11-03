<script lang="ts">
	import { onMount } from 'svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import ProductForm from '#lib/frontend/components/admin/catalog/ProductForm.svelte';
	import type {
		CatalogBrandOption,
		CatalogCategoryOption
	} from '#lib/frontend/components/admin/catalog/ProductForm.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';

	let categories = $state<CatalogCategoryOption[]>([]);
	let brands = $state<CatalogBrandOption[]>([]);
	let loading = $state(true);
	let error = $state('');

	onMount(() => {
		void loadOptions();
	});

	async function loadOptions() {
		loading = true;
		error = '';

		try {
			const [categoryResponse, brandResponse] = await Promise.all([
				fetch('/api/admin/categories'),
				fetch('/api/admin/brands')
			]);
			const [categoryPayload, brandPayload] = await Promise.all([
				categoryResponse.json().catch(() => ({})),
				brandResponse.json().catch(() => ({}))
			]);

			if (!categoryResponse.ok) {
				throw new Error(categoryPayload.error ?? 'Could not load categories');
			}

			if (!brandResponse.ok) {
				throw new Error(brandPayload.error ?? 'Could not load brands');
			}

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
			error = err instanceof Error ? err.message : 'Could not load form options';
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
				<Button onclick={loadOptions}>Try again</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else}
	<ProductForm {categories} {brands} />
{/if}
