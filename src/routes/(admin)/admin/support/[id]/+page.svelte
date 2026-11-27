<script lang="ts">
	import { onMount } from 'svelte';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';
	import { page } from '$app/state';
	import { ArrowLeft, LoaderCircle, Send, UserCheck } from '@lucide/svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import { authClient } from '#frontend/modules/auth/index.ts';

	type SupportMessage = {
		id: string;
		senderUserId: string;
		senderName: string | null;
		senderEmail: string | null;
		body: string;
		attachmentsJson: unknown[] | null;
		createdAt: string;
	};

	type TicketDetail = {
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
		messages: SupportMessage[];
	};

	const statuses = ['open', 'pending', 'resolved', 'closed'];
	const priorities = ['low', 'normal', 'high', 'urgent'];

	const session = authClient.useSession();
	const currentUserId = $derived($session.data?.user.id);

	let ticket = $state<TicketDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let actionError = $state('');

	let status = $state('');
	let priority = $state('');
	let savingControls = $state(false);
	let assigning = $state(false);

	let reply = $state('');
	let sending = $state(false);

	const isAssignedToMe = $derived(
		Boolean(ticket?.assignedAdminId && currentUserId && ticket.assignedAdminId === currentUserId)
	);

	onMount(() => {
		void load(page.params.id);
	});

	async function load(id: string | undefined) {
		if (!id) {
			error = m.admin_ops_ticket_not_found_short();
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/support/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_ticket_load_failed'));

			ticket = payload.data as TicketDetail;
			status = ticket.status;
			priority = ticket.priority;
		} catch (err) {
			error = errorMessage(err, 'admin_ops_ticket_load_failed');
		} finally {
			loading = false;
		}
	}

	async function saveControls(event: SubmitEvent) {
		event.preventDefault();
		if (!ticket) return;

		actionError = '';
		savingControls = true;

		try {
			const response = await fetch(`/api/admin/support/${ticket.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ status, priority })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_ticket_update_failed'));

			await load(ticket.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_ticket_update_failed');
		} finally {
			savingControls = false;
		}
	}

	async function assignToMe() {
		if (!ticket || !currentUserId) return;

		actionError = '';
		assigning = true;

		try {
			const response = await fetch(`/api/admin/support/${ticket.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ assignedAdminId: currentUserId })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_ticket_assign_failed'));

			await load(ticket.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_ticket_assign_failed');
		} finally {
			assigning = false;
		}
	}

	async function unassign() {
		if (!ticket) return;

		actionError = '';
		assigning = true;

		try {
			const response = await fetch(`/api/admin/support/${ticket.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ assignedAdminId: null })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_ticket_unassign_failed'));

			await load(ticket.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_ticket_unassign_failed');
		} finally {
			assigning = false;
		}
	}

	async function sendReply(event: SubmitEvent) {
		event.preventDefault();
		if (!ticket || !reply.trim()) return;

		actionError = '';
		sending = true;

		try {
			const response = await fetch(`/api/admin/support/${ticket.id}/messages`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ body: reply.trim() })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(errorMessage(payload, 'admin_ops_ticket_reply_failed'));

			reply = '';
			await load(ticket.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_ops_ticket_reply_failed');
		} finally {
			sending = false;
		}
	}

	function formatDate(value: string) {
		return formatDateTime(value) || '—';
	}
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
	</div>
{:else if error && !ticket}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-destructive">{error}</p>
			<div class="flex justify-center gap-2">
				<Button variant="outline" href="/admin/support">
					<ArrowLeft class="size-4" />
					{m.admin_ops_ticket_back()}
				</Button>
				<Button onclick={() => void load(page.params.id)}>{m.common_retry()}</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if ticket}
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-2">
				<Button variant="ghost" size="sm" href="/admin/support">
					<ArrowLeft class="size-4" />
					{m.admin_ops_ticket_back()}
				</Button>
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
					<StatusBadge kind="ticket" status={ticket.status} />
					<StatusBadge kind="priority" status={ticket.priority} />
				</div>
				<p class="text-sm text-muted-foreground">
					{m.admin_ops_ticket_meta({
						number: ticket.ticketNumber,
						category: ticket.category,
						date: formatDate(ticket.updatedAt)
					})}
				</p>
			</div>
		</div>

		{#if actionError}
			<div
				class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				role="alert"
			>
				{actionError}
			</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-3">
			<Card.Root class="lg:col-span-2">
				<Card.Header>
					<Card.Title>{m.admin_ops_ticket_conversation()}</Card.Title>
					<Card.Description>
						{m.admin_ops_ticket_messages_count({ count: ticket.messages.length })}
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if ticket.messages.length === 0}
						<p class="text-sm text-muted-foreground">{m.admin_ops_ticket_no_messages()}</p>
					{:else}
						<ul class="space-y-4">
							{#each ticket.messages as message (message.id)}
								{@const own = message.senderUserId === currentUserId}
								<li class={own ? 'flex justify-end' : 'flex justify-start'}>
									<div
										class={own
											? 'max-w-[80%] rounded-lg bg-primary px-3 py-2 text-primary-foreground'
											: 'max-w-[80%] rounded-lg border bg-muted px-3 py-2'}
									>
										<div class="mb-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
											<span class="font-medium">
												{message.senderName ??
													message.senderEmail ??
													m.admin_ops_ticket_sender_fallback()}
											</span>
											<span>{formatDate(message.createdAt)}</span>
										</div>
										<p class="text-sm whitespace-pre-line">{message.body}</p>
									</div>
								</li>
							{/each}
						</ul>
					{/if}

					<Separator />

					<form class="space-y-3" onsubmit={sendReply}>
						<Field.Field>
							<Field.Label for="support-reply">{m.admin_ops_ticket_reply()}</Field.Label>
							<Textarea
								id="support-reply"
								bind:value={reply}
								placeholder={m.admin_ops_ticket_reply_placeholder()}
								rows={4}
								required
							/>
						</Field.Field>
						<div class="flex justify-end">
							<Button type="submit" disabled={sending || !reply.trim()}>
								<Send class="size-4" />
								{sending ? m.admin_ops_ticket_sending() : m.admin_ops_ticket_send_reply()}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<div class="space-y-4">
				<Card.Root>
					<Card.Header>
						<Card.Title>{m.admin_ops_ticket_controls()}</Card.Title>
						<Card.Description>{m.admin_ops_ticket_controls_desc()}</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<form class="space-y-4" onsubmit={saveControls}>
							<Field.Field>
								<Field.Label for="support-status">{m.common_status()}</Field.Label>
								<Select.Root type="single" bind:value={status}>
									<Select.Trigger id="support-status" class="w-full">
										<Select.Value placeholder={m.admin_ops_ticket_select_status()} />
									</Select.Trigger>
									<Select.Content>
										{#each statuses as option (option)}
											<Select.Item value={option} label={statusLabel('ticket', option)}>
												{statusLabel('ticket', option)}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label for="support-priority">{m.admin_ops_support_priority()}</Field.Label>
								<Select.Root type="single" bind:value={priority}>
									<Select.Trigger id="support-priority" class="w-full">
										<Select.Value placeholder={m.admin_ops_ticket_select_priority()} />
									</Select.Trigger>
									<Select.Content>
										{#each priorities as option (option)}
											<Select.Item value={option} label={statusLabel('priority', option)}>
												{statusLabel('priority', option)}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<div class="flex justify-end">
								<Button type="submit" disabled={savingControls}>
									{savingControls ? m.common_saving() : m.common_save_changes()}
								</Button>
							</div>
						</form>

						<Separator />

						<div class="space-y-2">
							<p class="text-xs text-muted-foreground">{m.admin_ops_ticket_assignment()}</p>
							<p class="text-sm font-medium">
								{#if isAssignedToMe}
									{m.admin_ops_ticket_assigned_you()}
								{:else if ticket.assignedAdminId}
									{m.admin_ops_ticket_assigned_other()}
								{:else}
									{m.admin_ops_ticket_unassigned()}
								{/if}
							</p>
							<div class="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={assignToMe}
									disabled={assigning || isAssignedToMe || !currentUserId}
								>
									<UserCheck class="size-4" />
									{m.admin_ops_ticket_assign_me()}
								</Button>
								{#if ticket.assignedAdminId}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={unassign}
										disabled={assigning}
									>
										{m.admin_ops_ticket_unassign()}
									</Button>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>{m.admin_ops_ticket_customer_order()}</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3 text-sm">
						<div class="space-y-1">
							<p class="text-xs text-muted-foreground">{m.common_customer()}</p>
							{#if ticket.userId}
								<a href={`/admin/customers/${ticket.userId}`} class="font-medium hover:underline">
									{ticket.customerName ?? ticket.customerEmail ?? ticket.userId}
								</a>
							{:else}
								<p class="font-medium">{m.admin_ops_ticket_unknown_customer()}</p>
							{/if}
							{#if ticket.customerEmail}
								<p class="text-muted-foreground">{ticket.customerEmail}</p>
							{/if}
						</div>

						<Separator />

						<div class="space-y-1">
							<p class="text-xs text-muted-foreground">{m.common_order()}</p>
							{#if ticket.orderId}
								<a href={`/admin/orders/${ticket.orderId}`} class="font-medium hover:underline">
									{m.admin_ops_ticket_view_order()}
								</a>
							{:else}
								<p class="text-muted-foreground">{m.admin_ops_ticket_no_order()}</p>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">{m.admin_ops_ticket_not_found()}</p>
			<Button href="/admin/support">{m.admin_ops_ticket_back()}</Button>
		</Card.Content>
	</Card.Root>
{/if}
