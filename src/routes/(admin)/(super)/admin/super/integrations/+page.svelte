<script lang="ts">
	import { onMount } from 'svelte';
	import { CreditCard, Database, HardDrive, KeyRound } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';

	type IntegrationStatus = {
		db: { provider: string; configured: boolean };
		storage: { provider: string; configured: boolean };
		google: { configured: boolean };
		paymentGateway: { configured: boolean; note?: string };
	};

	let integrations = $state<IntegrationStatus | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(() => {
		void load();
	});

	async function load() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/super/integrations');
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			integrations = payload.data;
		} catch (err) {
			error = errorMessage(err, 'admin_super_integrations_load_failed');
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_integrations_title()}</h1>
		<p class="text-sm text-muted-foreground">
			{m.admin_super_integrations_subtitle()}
		</p>
	</div>

	{#if error}
		<Card.Root>
			<Card.Content class="py-6 text-sm text-destructive">{error}</Card.Content>
		</Card.Root>
	{/if}

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each Array(4) as _, index (index)}
				<Skeleton class="h-40 w-full rounded-xl" />
			{/each}
		</div>
	{:else if integrations}
		<div class="grid gap-4 sm:grid-cols-2">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0">
					<div class="flex items-center gap-2">
						<Database class="size-4 text-muted-foreground" />
						<Card.Title class="text-base">{m.admin_super_integrations_database()}</Card.Title>
					</div>
					<Badge variant={integrations.db.configured ? 'default' : 'secondary'}>
						{integrations.db.configured
							? m.admin_super_integrations_configured()
							: m.admin_super_integrations_not_configured()}
					</Badge>
				</Card.Header>
				<Card.Content class="space-y-1">
					<p class="text-sm text-muted-foreground">{m.admin_super_integrations_provider()}</p>
					<code class="text-sm font-medium">{integrations.db.provider}</code>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0">
					<div class="flex items-center gap-2">
						<HardDrive class="size-4 text-muted-foreground" />
						<Card.Title class="text-base">{m.admin_super_storage_title()}</Card.Title>
					</div>
					<Badge variant={integrations.storage.configured ? 'default' : 'secondary'}>
						{integrations.storage.configured
							? m.admin_super_integrations_configured()
							: m.admin_super_integrations_not_configured()}
					</Badge>
				</Card.Header>
				<Card.Content class="space-y-1">
					<p class="text-sm text-muted-foreground">{m.admin_super_integrations_provider()}</p>
					<code class="text-sm font-medium">{integrations.storage.provider}</code>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0">
					<div class="flex items-center gap-2">
						<KeyRound class="size-4 text-muted-foreground" />
						<Card.Title class="text-base">{m.admin_super_integrations_google()}</Card.Title>
					</div>
					<Badge variant={integrations.google.configured ? 'default' : 'secondary'}>
						{integrations.google.configured
							? m.admin_super_integrations_configured()
							: m.admin_super_integrations_not_configured()}
					</Badge>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">{m.admin_super_integrations_google_desc()}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between gap-2 space-y-0">
					<div class="flex items-center gap-2">
						<CreditCard class="size-4 text-muted-foreground" />
						<Card.Title class="text-base">{m.admin_super_integrations_payment_gateway()}</Card.Title
						>
					</div>
					<Badge variant={integrations.paymentGateway.configured ? 'default' : 'secondary'}>
						{integrations.paymentGateway.configured
							? m.admin_super_integrations_configured()
							: m.admin_super_integrations_not_configured()}
					</Badge>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						{integrations.paymentGateway.configured
							? (integrations.paymentGateway.note ?? '')
							: m.admin_super_integrations_no_gateway()}
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>
