<script lang="ts">
	import { onMount } from 'svelte';
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
			error = 'Ticket not found.';
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/support/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(payload.error ?? 'Could not load ticket');

			ticket = payload.data as TicketDetail;
			status = ticket.status;
			priority = ticket.priority;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not load ticket';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not update ticket');

			await load(ticket.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not update ticket';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not assign ticket');

			await load(ticket.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not assign ticket';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not unassign ticket');

			await load(ticket.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not unassign ticket';
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

			if (!response.ok) throw new Error(payload.error ?? 'Could not send reply');

			reply = '';
			await load(ticket.id);
		} catch (err) {
			actionError = err instanceof Error ? err.message : 'Could not send reply';
		} finally {
			sending = false;
		}
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
					Back to support
				</Button>
				<Button onclick={() => void load(page.params.id)}>Try again</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if ticket}
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-2">
				<Button variant="ghost" size="sm" href="/admin/support">
					<ArrowLeft class="size-4" />
					Back to support
				</Button>
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-2xl font-semibold tracking-tight">{ticket.subject}</h1>
					<StatusBadge status={ticket.status} />
					<StatusBadge status={ticket.priority} />
				</div>
				<p class="text-sm text-muted-foreground">
					{ticket.ticketNumber} · {ticket.category} · Updated {formatDate(ticket.updatedAt)}
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
					<Card.Title>Conversation</Card.Title>
					<Card.Description>{ticket.messages.length} messages</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if ticket.messages.length === 0}
						<p class="text-sm text-muted-foreground">No messages on this ticket yet.</p>
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
												{message.senderName ?? message.senderEmail ?? 'Support'}
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
							<Field.Label for="support-reply">Reply</Field.Label>
							<Textarea
								id="support-reply"
								bind:value={reply}
								placeholder="Write a reply to the customer"
								rows={4}
								required
							/>
						</Field.Field>
						<div class="flex justify-end">
							<Button type="submit" disabled={sending || !reply.trim()}>
								<Send class="size-4" />
								{sending ? 'Sending…' : 'Send reply'}
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<div class="space-y-4">
				<Card.Root>
					<Card.Header>
						<Card.Title>Ticket controls</Card.Title>
						<Card.Description>Update status, priority and assignment.</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<form class="space-y-4" onsubmit={saveControls}>
							<Field.Field>
								<Field.Label for="support-status">Status</Field.Label>
								<Select.Root type="single" bind:value={status}>
									<Select.Trigger id="support-status" class="w-full">
										<Select.Value placeholder="Select status" />
									</Select.Trigger>
									<Select.Content>
										{#each statuses as option (option)}
											<Select.Item value={option} label={option}>{option}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label for="support-priority">Priority</Field.Label>
								<Select.Root type="single" bind:value={priority}>
									<Select.Trigger id="support-priority" class="w-full">
										<Select.Value placeholder="Select priority" />
									</Select.Trigger>
									<Select.Content>
										{#each priorities as option (option)}
											<Select.Item value={option} label={option}>{option}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<div class="flex justify-end">
								<Button type="submit" disabled={savingControls}>
									{savingControls ? 'Saving…' : 'Save changes'}
								</Button>
							</div>
						</form>

						<Separator />

						<div class="space-y-2">
							<p class="text-xs text-muted-foreground">Assignment</p>
							<p class="text-sm font-medium">
								{#if isAssignedToMe}
									Assigned to you
								{:else if ticket.assignedAdminId}
									Assigned to another admin
								{:else}
									Unassigned
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
									Assign to me
								</Button>
								{#if ticket.assignedAdminId}
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onclick={unassign}
										disabled={assigning}
									>
										Unassign
									</Button>
								{/if}
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title>Customer and order</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-3 text-sm">
						<div class="space-y-1">
							<p class="text-xs text-muted-foreground">Customer</p>
							{#if ticket.userId}
								<a href={`/admin/customers/${ticket.userId}`} class="font-medium hover:underline">
									{ticket.customerName ?? ticket.customerEmail ?? ticket.userId}
								</a>
							{:else}
								<p class="font-medium">Unknown customer</p>
							{/if}
							{#if ticket.customerEmail}
								<p class="text-muted-foreground">{ticket.customerEmail}</p>
							{/if}
						</div>

						<Separator />

						<div class="space-y-1">
							<p class="text-xs text-muted-foreground">Order</p>
							{#if ticket.orderId}
								<a href={`/admin/orders/${ticket.orderId}`} class="font-medium hover:underline">
									View order
								</a>
							{:else}
								<p class="text-muted-foreground">No order linked.</p>
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
			<p class="text-sm text-muted-foreground">This ticket could not be found.</p>
			<Button href="/admin/support">Back to support</Button>
		</Card.Content>
	</Card.Root>
{/if}
