<script lang="ts">
	import {
		formatDate,
		formatDateTime,
		formatMoney
	} from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		ArrowLeft,
		BadgeCheck,
		Calendar,
		DollarSign,
		LoaderCircle,
		Mail,
		MapPin,
		RefreshCw,
		ShoppingCart
	} from '@lucide/svelte';
	import DataTable from '#lib/frontend/components/admin/DataTable.svelte';
	import StatCard from '#lib/frontend/components/admin/StatCard.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import * as Avatar from '#lib/frontend/components/ui/avatar/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';

	type CustomerOrder = {
		id: string;
		orderNumber: string;
		status: string;
		paymentStatus: string;
		grandTotal: number;
		currency: string;
		placedAt: string;
	};

	type CustomerAddress = {
		id: string;
		label: string;
		recipientName: string;
		phone: string;
		line1: string;
		line2: string | null;
		city: string;
		region: string | null;
		postalCode: string | null;
		country: string;
		isDefaultShipping: boolean;
		isDefaultBilling: boolean;
	};

	type CustomerDetail = {
		id: string;
		name: string;
		email: string;
		image: string | null;
		emailVerified: boolean;
		createdAt: string;
		updatedAt: string;
		orderCount: number;
		spent: number;
		orders: CustomerOrder[];
		addresses: CustomerAddress[];
	};

	const orderColumns = $derived([
		{ key: 'orderNumber', label: m.common_order() },
		{ key: 'status', label: m.common_status() },
		{ key: 'paymentStatus', label: m.common_payment() },
		{ key: 'grandTotal', label: m.common_total(), class: 'text-right' },
		{ key: 'placedAt', label: m.admin_ops_dashboard_col_placed() }
	]);

	let customer = $state<CustomerDetail | null>(null);
	let loading = $state(true);
	let notFound = $state(false);
	let error = $state('');

	onMount(() => {
		void load(page.params.id);
	});

	async function load(id: string | undefined) {
		if (!id) {
			notFound = true;
			loading = false;
			return;
		}

		loading = true;
		error = '';
		notFound = false;
		customer = null;

		try {
			const response = await fetch(`/api/admin/customers/${id}`);

			if (response.status === 404) {
				notFound = true;
				return;
			}

			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_customer_load_failed'));

			customer = payload.data as CustomerDetail;
		} catch (err) {
			error = errorMessage(err, 'admin_ops_customer_load_failed');
		} finally {
			loading = false;
		}
	}

	function initials(name: string, email: string) {
		const source = name.trim() || email.trim();
		const parts = source.split(/\s+/).filter(Boolean);

		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

		return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
	}

	function formatAddress(address: CustomerAddress) {
		return [
			address.line1,
			address.line2,
			[address.city, address.region, address.postalCode].filter(Boolean).join(', '),
			address.country
		]
			.filter(Boolean)
			.join('\n');
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Button variant="ghost" size="sm" href="/admin/customers">
			<ArrowLeft class="size-4" />
			{m.admin_ops_customer_back()}
		</Button>
		<Button
			variant="outline"
			size="sm"
			onclick={() => void load(page.params.id)}
			disabled={loading}
		>
			<RefreshCw class="size-4" />
			{m.common_refresh()}
		</Button>
	</div>

	{#if loading}
		<div class="space-y-4">
			<Skeleton class="h-36 w-full rounded-xl" />
			<div class="grid gap-4 sm:grid-cols-2">
				<Skeleton class="h-28 w-full rounded-xl" />
				<Skeleton class="h-28 w-full rounded-xl" />
			</div>
			<Skeleton class="h-64 w-full rounded-xl" />
		</div>
	{:else if notFound}
		<Card.Root>
			<Card.Content class="space-y-4 py-10 text-center">
				<p class="text-sm text-muted-foreground">{m.admin_ops_customer_not_found()}</p>
				<Button href="/admin/customers">{m.admin_ops_customer_back()}</Button>
			</Card.Content>
		</Card.Root>
	{:else if error}
		<Card.Root>
			<Card.Content class="space-y-4 py-10 text-center">
				<p class="text-sm text-destructive">{error}</p>
				<div class="flex justify-center gap-2">
					<Button variant="outline" href="/admin/customers">{m.admin_ops_customer_back()}</Button>
					<Button onclick={() => void load(page.params.id)}>{m.common_retry()}</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else if customer}
		<Card.Root>
			<Card.Content class="flex flex-wrap items-start gap-4 py-6">
				<Avatar.Root size="lg" class="size-16">
					{#if customer.image}
						<Avatar.Image src={customer.image} alt={customer.name || customer.email} />
					{/if}
					<Avatar.Fallback class="text-lg">
						{initials(customer.name, customer.email)}
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="min-w-0 flex-1 space-y-1.5">
					<div class="flex flex-wrap items-center gap-2">
						<h1 class="text-2xl font-semibold tracking-tight">
							{customer.name || m.admin_ops_customer_unnamed()}
						</h1>
						{#if customer.emailVerified}
							<Badge class="gap-1">
								<BadgeCheck class="size-3.5" />
								{m.admin_ops_customer_verified()}
							</Badge>
						{:else}
							<Badge variant="secondary">{m.admin_ops_customer_unverified()}</Badge>
						{/if}
					</div>
					<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Mail class="size-4" />
						{customer.email}
					</p>
					<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Calendar class="size-4" />
						{m.admin_ops_customer_joined({ date: formatDate(customer.createdAt) })}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="grid gap-4 sm:grid-cols-2">
			<StatCard
				title={m.common_orders()}
				value={customer.orderCount}
				hint={m.admin_ops_dashboard_orders_hint()}
				icon={ShoppingCart}
			/>
			<StatCard
				title={m.admin_ops_customer_lifetime_spend()}
				value={formatMoney(customer.spent)}
				hint={m.admin_ops_customer_across_orders()}
				icon={DollarSign}
			/>
		</div>

		<div class="space-y-3">
			<div>
				<h2 class="text-lg font-semibold tracking-tight">{m.common_orders()}</h2>
				<p class="text-sm text-muted-foreground">{m.admin_ops_customer_orders_desc()}</p>
			</div>

			<DataTable
				columns={orderColumns}
				rows={customer.orders as unknown as Record<string, unknown>[]}
				emptyMessage={m.admin_ops_customer_no_orders()}
				page={1}
				pageSize={Math.max(1, customer.orders.length)}
				total={customer.orders.length}
			>
				{#snippet cell(row, column)}
					{#if column.key === 'orderNumber'}
						<a href={`/admin/orders/${String(row.id)}`} class="font-medium hover:underline">
							{String(row.orderNumber ?? '—')}
						</a>
					{:else if column.key === 'status'}
						<StatusBadge kind="order" status={String(row.status ?? '')} />
					{:else if column.key === 'paymentStatus'}
						<StatusBadge kind="payment" status={String(row.paymentStatus ?? '')} />
					{:else if column.key === 'grandTotal'}
						<span class="font-medium">
							{formatMoney(Number(row.grandTotal ?? 0), String(row.currency ?? 'IDR'))}
						</span>
					{:else if column.key === 'placedAt'}
						<span class="text-muted-foreground"
							>{formatDateTime(String(row.placedAt ?? '')) || '—'}</span
						>
					{:else}
						{String(row[column.key] ?? '—')}
					{/if}
				{/snippet}
			</DataTable>
		</div>

		<Separator />

		<div class="space-y-3">
			<div>
				<h2 class="text-lg font-semibold tracking-tight">{m.common_addresses()}</h2>
				<p class="text-sm text-muted-foreground">{m.admin_ops_customer_addresses_desc()}</p>
			</div>

			{#if customer.addresses.length === 0}
				<Card.Root>
					<Card.Content class="py-8 text-center text-sm text-muted-foreground">
						{m.admin_ops_customer_no_addresses()}
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="grid gap-4 md:grid-cols-2">
					{#each customer.addresses as address (address.id)}
						<Card.Root>
							<Card.Header>
								<Card.Title class="flex items-center gap-2 text-base">
									<MapPin class="size-4 text-muted-foreground" />
									{address.label || m.common_address()}
								</Card.Title>
								<Card.Description class="flex flex-wrap gap-1.5">
									{#if address.isDefaultShipping}
										<Badge variant="outline">{m.admin_ops_customer_default_shipping()}</Badge>
									{/if}
									{#if address.isDefaultBilling}
										<Badge variant="outline">{m.admin_ops_customer_default_billing()}</Badge>
									{/if}
								</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-1 text-sm">
								<p class="font-medium">{address.recipientName}</p>
								<p class="text-muted-foreground">{address.phone}</p>
								<p class="whitespace-pre-line text-muted-foreground">
									{formatAddress(address)}
								</p>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex h-64 items-center justify-center">
			<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
		</div>
	{/if}
</div>
