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
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { m } from '#lib/paraglide/messages.js';
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

			if (!response.ok) throw payload;

			variants = (payload.data.variants as StockVariant[]).map((variant) => ({
				id: variant.id,
				name: variant.name,
				sku: variant.sku,
				stock: variant.stock
			}));
			onstockchange?.(variants.map(({ id, stock }) => ({ id, stock })));

			movements = await loadMovements(variants);
		} catch (err) {
			error = errorMessage(err, 'components_stock_panel_load_failed');
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

				if (!response.ok) {
					throw new Error(errorMessage(payload, 'components_stock_panel_history_failed'));
				}

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
		return formatDateTime(value) || m.common_dash();
	}

	function formatReference(type: string | null, id: string | null) {
		if (!type) return m.common_dash();

		return id ? `${type} · ${id}` : type;
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="font-medium">{m.components_stock_panel_title()}</h3>
		<p class="text-sm text-muted-foreground">
			{m.components_stock_panel_description()}
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
			{m.components_stock_panel_no_variants()}
		</div>
	{:else}
		<div class="rounded-lg border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>{m.components_stock_panel_variant()}</Table.Head>
						<Table.Head>{m.components_form_sku()}</Table.Head>
						<Table.Head class="text-right">{m.components_stock_panel_in_stock()}</Table.Head>
						<Table.Head class="text-right"
							><span class="sr-only">{m.common_actions()}</span></Table.Head
						>
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
									{m.components_stock_panel_adjust()}
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		<div class="space-y-3">
			<div>
				<h4 class="font-medium">{m.components_stock_panel_recent()}</h4>
				<p class="text-sm text-muted-foreground">{m.components_stock_panel_recent_hint()}</p>
			</div>

			{#if movements.length === 0}
				<div class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
					{m.components_stock_panel_no_movements()}
				</div>
			{:else}
				<div class="rounded-lg border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{m.common_date()}</Table.Head>
								<Table.Head>{m.components_stock_panel_variant()}</Table.Head>
								<Table.Head class="text-right">{m.components_inventory_adjust_change()}</Table.Head>
								<Table.Head>{m.components_inventory_adjust_reason()}</Table.Head>
								<Table.Head>{m.components_stock_panel_reference()}</Table.Head>
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
											: 'text-success'}"
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
