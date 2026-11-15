<script lang="ts" module>
	export type StockVariant = {
		id: string;
		name: string;
		sku: string;
		stock: number;
	};

	export type StockMovement = {
		id: string;
		variantId: string;
		delta: number;
		reason: string;
		referenceType: string | null;
		referenceId: string | null;
		createdAt: string;
		variantName: string;
		variantSku: string;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { LoaderCircle } from '@lucide/svelte';
	import InventoryAdjustDialog from '#lib/frontend/components/admin/catalog/InventoryAdjustDialog.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';

	let {
		productId,
		onstockchange
	}: {
		productId: string;
		onstockchange?: (stocks: Array<{ id: string; stock: number }>) => void;
	} = $props();

	let variants = $state<StockVariant[]>([]);
	let movements = $state<StockMovement[]>([]);
	let loading = $state(true);
	let error = $state('');

	let adjustOpen = $state(false);
	let adjusting = $state<StockVariant | null>(null);

	onMount(() => {
		void load();
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/products/${productId}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load stock');

			variants = (payload.data.variants as StockVariant[]).map((variant) => ({
				id: variant.id,
				name: variant.name,
				sku: variant.sku,
				stock: variant.stock
			}));
			onstockchange?.(variants.map(({ id, stock }) => ({ id, stock })));

			movements = await loadMovements(variants);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load stock';
		} finally {
			loading = false;
		}
	}

	async function loadMovements(list: StockVariant[]) {
		const batches = await Promise.all(
			list.map(async (variant) => {
				const response = await fetch(
					`/api/admin/inventory/movements?variantId=${encodeURIComponent(variant.id)}&pageSize=10`
				);
				const payload = await response.json().catch(() => ({}));

				if (!response.ok) throw new Error(payload.error ?? 'Could not load stock history');

				return payload.data as StockMovement[];
			})
		);

		return batches
			.flat()
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
			.slice(0, 20);
	}

	function openAdjust(variant: StockVariant) {
		adjusting = variant;
		adjustOpen = true;
	}

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	}

	function formatReference(type: string | null, id: string | null) {
		if (!type) return '—';

		return id ? `${type} · ${id}` : type;
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="font-medium">Stock</h3>
		<p class="text-sm text-muted-foreground">
			Stock changes are recorded as movements. Adjust a variant here instead of editing it in the
			variant list.
		</p>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{/if}

	{#if loading && variants.length === 0}
		<div class="flex h-32 items-center justify-center">
			<LoaderCircle class="size-5 animate-spin text-muted-foreground" />
		</div>
	{:else if variants.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
			Add a variant first to track its stock.
		</div>
	{:else}
		<div class="rounded-lg border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Variant</Table.Head>
						<Table.Head>SKU</Table.Head>
						<Table.Head class="text-right">In stock</Table.Head>
						<Table.Head class="text-right"><span class="sr-only">Actions</span></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each variants as variant (variant.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{variant.name}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{variant.sku}</Table.Cell>
							<Table.Cell class="text-right tabular-nums">{variant.stock}</Table.Cell>
							<Table.Cell class="text-right">
								<Button variant="outline" size="sm" onclick={() => openAdjust(variant)}>
									Adjust
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<div class="space-y-3">
			<div>
				<h4 class="font-medium">Recent movements</h4>
				<p class="text-sm text-muted-foreground">The latest stock changes for this product.</p>
			</div>

			{#if movements.length === 0}
				<div class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
					No stock movements yet.
				</div>
			{:else}
				<div class="rounded-lg border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Date</Table.Head>
								<Table.Head>Variant</Table.Head>
								<Table.Head class="text-right">Change</Table.Head>
								<Table.Head>Reason</Table.Head>
								<Table.Head>Reference</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each movements as movement (movement.id)}
								<Table.Row>
									<Table.Cell class="whitespace-nowrap text-muted-foreground">
										{formatDate(movement.createdAt)}
									</Table.Cell>
									<Table.Cell>
										{movement.variantName}
										<span class="block text-xs text-muted-foreground">{movement.variantSku}</span>
									</Table.Cell>
									<Table.Cell
										class="text-right tabular-nums {movement.delta < 0
											? 'text-destructive'
											: 'text-emerald-600'}"
									>
										{movement.delta > 0 ? `+${movement.delta}` : movement.delta}
									</Table.Cell>
									<Table.Cell>{movement.reason}</Table.Cell>
									<Table.Cell class="text-muted-foreground">
										{formatReference(movement.referenceType, movement.referenceId)}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</div>
	{/if}
</div>

<InventoryAdjustDialog bind:open={adjustOpen} variant={adjusting} onsaved={load} />
