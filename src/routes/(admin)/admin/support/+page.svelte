<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { ArrowRight } from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	type TicketRow = {
		id: string;
		ticketNumber: string;
		subject: string;
		category: string;
		priority: string;
		status: string;
		userId: string;
		customerName: string | null;
		customerEmail: string | null;
		orderId: string | null;
		assignedAdminId: string | null;
		createdAt: string;
		updatedAt: string;
	};

	const columns = [
		{ key: 'ticketNumber', label: 'Ticket' },
		{ key: 'subject', label: 'Subject' },
		{ key: 'customerName', label: 'Customer' },
		{ key: 'priority', label: 'Priority' },
		{ key: 'status', label: 'Status' },
		{ key: 'updatedAt', label: 'Updated' },
		{ key: 'actions', label: '', class: 'text-right' }
	];

	const pageSize = 25;

	let tickets = $state<TicketRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	let q = $state('');
	let statusFilter = $state('all');
	let priorityFilter = $state('all');
	let page = $state(1);
	let total = $state(0);

	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		void loadTickets();
	});

	onDestroy(() => {
		if (searchTimer) clearTimeout(searchTimer);
	});

	async function loadTickets() {
		loading = true;
		error = '';

		try {
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('pageSize', String(pageSize));
			if (q.trim()) params.set('q', q.trim());
			if (statusFilter !== 'all') params.set('status', statusFilter);
			if (priorityFilter !== 'all') params.set('priority', priorityFilter);

			const response = await fetch(`/api/admin/support?${params.toString()}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load tickets');

			tickets = payload.data ?? [];
			total = Number(payload.total ?? 0);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load tickets';
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		if (searchTimer) clearTimeout(searchTimer);

		searchTimer = setTimeout(() => {
			page = 1;
			void loadTickets();
		}, 300);
	}

	function handleStatusChange(value: string) {
		statusFilter = value;
		page = 1;
		void loadTickets();
	}

	function handlePriorityChange(value: string) {
		priorityFilter = value;
		page = 1;
		void loadTickets();
	}

	function handlePageChange(nextPage: number) {
		page = nextPage;
		void loadTickets();
	}

	function formatDate(value: string) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '—';

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Support</h1>
		<p class="text-sm text-muted-foreground">
			Triage customer tickets and respond to conversations.
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

	<Card.Root>
		<Card.Content class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<div class="space-y-1.5">
				<Label for="support-search">Search</Label>
				<Input
					id="support-search"
					bind:value={q}
					oninput={handleSearch}
					placeholder="Search ticket, subject or email"
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="support-status-filter">Status</Label>
				<Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
					<Select.Trigger id="support-status-filter" class="w-full">
						<Select.Value placeholder="All statuses" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All statuses">All statuses</Select.Item>
						<Select.Item value="open" label="Open">Open</Select.Item>
						<Select.Item value="pending" label="Pending">Pending</Select.Item>
						<Select.Item value="resolved" label="Resolved">Resolved</Select.Item>
						<Select.Item value="closed" label="Closed">Closed</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="support-priority-filter">Priority</Label>
				<Select.Root type="single" value={priorityFilter} onValueChange={handlePriorityChange}>
					<Select.Trigger id="support-priority-filter" class="w-full">
						<Select.Value placeholder="All priorities" />
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all" label="All priorities">All priorities</Select.Item>
						<Select.Item value="low" label="Low">Low</Select.Item>
						<Select.Item value="normal" label="Normal">Normal</Select.Item>
						<Select.Item value="high" label="High">High</Select.Item>
						<Select.Item value="urgent" label="Urgent">Urgent</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<DataTable
		{columns}
		rows={tickets as unknown as Record<string, unknown>[]}
		{loading}
		emptyMessage="No tickets match the current filters."
		{page}
		{pageSize}
		{total}
		onPageChange={handlePageChange}
	>
		{#snippet cell(row, column)}
			{#if column.key === 'ticketNumber'}
				<a href={`/admin/support/${String(row.id)}`} class="font-medium hover:underline">
					{String(row.ticketNumber ?? '')}
				</a>
			{:else if column.key === 'subject'}
				<span class="block max-w-xs truncate">{String(row.subject ?? '')}</span>
			{:else if column.key === 'customerName'}
				<div class="space-y-0.5">
					<p>{String(row.customerName ?? row.customerEmail ?? '—')}</p>
					{#if row.customerName && row.customerEmail}
						<p class="text-xs text-muted-foreground">{String(row.customerEmail)}</p>
					{/if}
				</div>
			{:else if column.key === 'priority'}
				<StatusBadge status={String(row.priority ?? '')} />
			{:else if column.key === 'status'}
				<StatusBadge status={String(row.status ?? '')} />
			{:else if column.key === 'updatedAt'}
				<span class="text-muted-foreground">{formatDate(String(row.updatedAt ?? ''))}</span>
			{:else if column.key === 'actions'}
				<div class="flex items-center justify-end">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Open ticket"
						href={`/admin/support/${String(row.id)}`}
					>
						<ArrowRight class="size-4" />
					</Button>
				</div>
			{:else}
				{String(row[column.key] ?? '—')}
			{/if}
		{/snippet}
	</DataTable>
</div>
