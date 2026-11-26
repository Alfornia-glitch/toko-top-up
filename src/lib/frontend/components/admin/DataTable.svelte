<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';
	import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { cn } from '#lib/frontend/utils.ts';

	export type DataTableColumn = {
		key: string;
		label: string;
		sortable?: boolean;
		class?: string;
	};

	export type DataTableRow = Record<string, unknown>;

	let {
		columns,
		rows,
		loading = false,
		emptyMessage = m.components_data_table_empty(),
		page = 1,
		pageSize = 25,
		total = 0,
		sortKey,
		sortDir,
		onSort,
		onPageChange,
		cell
	}: {
		columns: DataTableColumn[];
		rows: DataTableRow[];
		loading?: boolean;
		emptyMessage?: string;
		page?: number;
		pageSize?: number;
		total?: number;
		sortKey?: string;
		sortDir?: 'asc' | 'desc';
		onSort?: (key: string) => void;
		onPageChange?: (page: number) => void;
		cell?: Snippet<[DataTableRow, DataTableColumn]>;
	} = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const from = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const to = $derived(Math.min(page * pageSize, total));
</script>

<div class="space-y-3">
	<div class="overflow-hidden rounded-lg border bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					{#each columns as column (column.key)}
						<Table.Head class={column.class}>
							{#if column.sortable && onSort}
								<button
									type="button"
									class="inline-flex items-center gap-1.5 hover:text-foreground"
									onclick={() => onSort(column.key)}
								>
									{column.label}
									{#if sortKey === column.key}
										{#if sortDir === 'asc'}
											<ArrowUp class="size-3.5" />
										{:else}
											<ArrowDown class="size-3.5" />
										{/if}
									{:else}
										<ArrowUpDown class="size-3.5 text-muted-foreground" />
									{/if}
								</button>
							{:else}
								{column.label}
							{/if}
						</Table.Head>
					{/each}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if loading}
					{#each Array(5) as _, index (index)}
						<Table.Row>
							{#each columns as column (column.key)}
								<Table.Cell>
									<Skeleton class="h-4 w-full max-w-32" />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else if rows.length === 0}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center text-muted-foreground">
							{emptyMessage}
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each rows as row, index (String(row.id ?? index))}
						<Table.Row>
							{#each columns as column (column.key)}
								<Table.Cell class={cn('whitespace-nowrap', column.class)}>
									{#if cell}
										{@render cell(row, column)}
									{:else}
										{String(row[column.key] ?? '—')}
									{/if}
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
		<span>{m.components_data_table_range({ from, to, total })}</span>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="sm"
				disabled={page <= 1 || loading}
				onclick={() => onPageChange?.(page - 1)}
			>
				<ChevronLeft class="size-4" />
				{m.common_previous()}
			</Button>
			<span>{m.common_page_of({ page, total: totalPages })}</span>
			<Button
				variant="outline"
				size="sm"
				disabled={page >= totalPages || loading}
				onclick={() => onPageChange?.(page + 1)}
			>
				{m.common_next()}
				<ChevronRight class="size-4" />
			</Button>
		</div>
	</div>
</div>
