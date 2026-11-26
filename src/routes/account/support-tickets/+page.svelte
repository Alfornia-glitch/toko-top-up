<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, priorityLabel } from '#lib/frontend/i18n/index.ts';
	import {
		listOrders,
		listTickets,
		getTicket,
		createTicket,
		addTicketMessage,
		isUnauthorized,
		type TicketForm
	} from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import { TICKET_STATUS_LABELS, statusLabel } from '#lib/frontend/content/status.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';
	import { unwrap } from '#lib/frontend/modules/shared/http.ts';
	import type {
		OrderSummary,
		SupportTicketDetail,
		SupportTicketSummary
	} from '#lib/frontend/modules/commerce/models.ts';

	const priorityOptions = ['low', 'normal', 'high', 'urgent'] as const;

	let tickets = $state<SupportTicketSummary[]>([]);
	let selected = $state<SupportTicketDetail | null>(null);
	let loading = $state(true);
	let detailLoading = $state(false);
	let error = $state('');
	let detailError = $state('');
	let formError = $state('');
	let replyError = $state('');
	let submitting = $state(false);
	let replying = $state(false);
	let orders = $state<OrderSummary[]>([]);
	let reply = $state('');
	let form = $state<TicketForm>({
		subject: '',
		category: '',
		priority: 'normal',
		message: '',
		orderId: 'none'
	});

	function redirectToLogin() {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function redirectIfUnauthorized(cause: unknown): boolean {
		if (isUnauthorized(cause)) {
			redirectToLogin();
			return true;
		}

		return false;
	}

	function setPriority(value: string) {
		form.priority = value;
	}

	async function loadTicket(id: string) {
		detailLoading = true;
		detailError = '';

		try {
			selected = await getTicket(id);
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				selected = null;
				detailError = errorMessage(cause, 'account_tickets_load_one_failed');
			}
		} finally {
			detailLoading = false;
		}
	}

	async function refreshTickets() {
		tickets = await listTickets();
	}

	async function initialize() {
		loading = true;
		error = '';

		try {
			const [ticketsPayload, ordersPayload] = await Promise.all([
				listTickets(),
				listOrders(1, 100)
			]);

			tickets = ticketsPayload;
			orders = ordersPayload.data;

			if (tickets.length > 0) await loadTicket(tickets[0].id);
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				error = errorMessage(cause, 'account_tickets_load_failed');
			}
		} finally {
			loading = false;
		}
	}

	async function submitTicket(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (!form.subject.trim() || !form.category.trim() || !form.message.trim()) {
			formError = m.account_tickets_required();
			return;
		}

		submitting = true;

		try {
			const created = await createTicket({
				subject: form.subject.trim(),
				category: form.category.trim(),
				priority: form.priority,
				message: form.message.trim(),
				orderId: form.orderId === 'none' ? null : form.orderId
			});

			await refreshTickets();
			selected = created;
			reply = '';
			form = { subject: '', category: '', priority: 'normal', message: '', orderId: 'none' };
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				formError = errorMessage(cause, 'account_tickets_create_failed');
			}
		} finally {
			submitting = false;
		}
	}

	async function submitReply(event: SubmitEvent) {
		event.preventDefault();
		replyError = '';

		if (!selected) return;

		if (!reply.trim()) {
			replyError = m.account_tickets_reply_required();
			return;
		}

		replying = true;
		const ticketId = selected.id;

		try {
			await addTicketMessage(ticketId, reply.trim());

			reply = '';
			await loadTicket(ticketId);
			await refreshTickets();
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				replyError = errorMessage(cause, 'account_tickets_reply_failed');
			}
		} finally {
			replying = false;
		}
	}

	onMount(() => {
		void initialize();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Support Tickets"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white py-[56px] max-[480px]:py-9"
		data-name="Support tickets"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 content-stretch items-start gap-[24px] overflow-clip px-[32px] max-[480px]:px-3.5"
			data-name="Flex Horizontal"
		>
			<AccountSidebar />

			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[14px]"
				data-name="Flex Vertical"
			>
				<p
					class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
				>
					{m.account_tickets_title()}
				</p>

				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
					data-name="Card"
				>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] px-[24px]"
						data-name="card-body"
					>
						<p
							class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
						>
							{m.account_tickets_new()}
						</p>

						<form class="flex w-full flex-col gap-[16px]" onsubmit={submitTicket}>
							<div class="grid w-full gap-[12px] sm:grid-cols-2">
								<div class="flex flex-col gap-[6px]">
									<Label for="ticket-subject">{m.account_tickets_subject()}</Label>
									<Input
										id="ticket-subject"
										bind:value={form.subject}
										placeholder={m.account_tickets_subject_placeholder()}
									/>
								</div>

								<div class="flex flex-col gap-[6px]">
									<Label for="ticket-category">{m.common_category()}</Label>
									<Input
										id="ticket-category"
										bind:value={form.category}
										placeholder={m.account_tickets_category_placeholder()}
									/>
								</div>

								<div class="flex flex-col gap-[6px]">
									<Label for="ticket-priority">{m.account_tickets_priority()}</Label>
									<Select.Root type="single" value={form.priority} onValueChange={setPriority}>
										<Select.Trigger id="ticket-priority" class="w-full">
											<Select.Value placeholder={m.account_tickets_select_priority()} />
										</Select.Trigger>
										<Select.Content>
											{#each priorityOptions as option (option)}
												<Select.Item value={option} label={priorityLabel(option)}>
													{priorityLabel(option)}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>

								<div class="flex flex-col gap-[6px]">
									<Label for="ticket-order">{m.account_tickets_related_order()}</Label>
									<Select.Root
										type="single"
										value={form.orderId}
										onValueChange={(value) => (form.orderId = value)}
									>
										<Select.Trigger id="ticket-order" class="w-full">
											<Select.Value placeholder={m.account_tickets_no_related_order()} />
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="none" label={m.account_tickets_no_related_order()}>
												{m.account_tickets_no_related_order()}
											</Select.Item>
											{#each orders as entry (entry.id)}
												<Select.Item value={entry.id} label={entry.orderNumber}>
													{entry.orderNumber}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>

							<div class="flex flex-col gap-[6px]">
								<Label for="ticket-message">{m.account_tickets_message()}</Label>
								<Textarea
									id="ticket-message"
									bind:value={form.message}
									placeholder={m.account_tickets_message_placeholder()}
								/>
							</div>

							{#if formError}
								<p class="text-sm text-[#b91c1c]" role="alert">{formError}</p>
							{/if}

							<div>
								<Button type="submit" disabled={submitting}>
									{submitting ? m.account_shared_submitting() : m.account_tickets_create()}
								</Button>
							</div>
						</form>
					</div>
				</div>

				{#if loading}
					<div
						class="relative flex w-full items-center justify-center gap-3 rounded-[14px] bg-white px-[24px] py-[64px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<Spinner class="size-5" aria-label={m.account_tickets_loading()} />
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
							{m.account_tickets_loading()}
						</p>
					</div>
				{:else if error}
					<div
						class="relative flex w-full rounded-[14px] border border-[#fecaca] bg-[#fef2f2] px-[24px] py-[16px] text-[#b91c1c]"
						data-name="Card"
						role="alert"
					>
						{error}
					</div>
				{:else if tickets.length === 0}
					<div
						class="relative flex w-full flex-col items-start gap-[12px] rounded-[14px] bg-white px-[24px] py-[32px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<p
							class="font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-[#0a0a0a]"
						>
							{m.account_tickets_empty_title()}
						</p>
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
							{m.account_tickets_empty_description()}
						</p>
					</div>
				{:else}
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px] px-[16px]"
							data-name="card-body"
						>
							{#each tickets as entry (entry.id)}
								<button
									type="button"
									class={`flex w-full flex-wrap items-start justify-between gap-[12px] rounded-[8px] border border-[#e5e5e5] p-[16px] text-left transition-colors ${
										selected?.id === entry.id ? 'bg-[#f5f5f5]' : 'bg-white hover:bg-[#fafafa]'
									}`}
									aria-pressed={selected?.id === entry.id}
									onclick={() => loadTicket(entry.id)}
								>
									<div class="min-w-0 flex-1">
										<p
											class="font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-[#0a0a0a]"
										>
											{entry.subject}
										</p>
										<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
											{entry.ticketNumber} · {entry.category} · {priorityLabel(entry.priority)}
										</p>
										<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
											{m.account_tickets_updated({ date: formatDateTime(entry.updatedAt) || '—' })}
										</p>
									</div>
									<div class="flex flex-col items-end gap-[4px] text-right">
										<Badge variant="outline">
											{statusLabel(TICKET_STATUS_LABELS, entry.status)}
										</Badge>
									</div>
								</button>
							{/each}
						</div>
					</div>

					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] px-[24px]"
							data-name="card-body"
						>
							{#if detailLoading}
								<div class="flex items-center gap-[12px]">
									<Spinner class="size-5" aria-label={m.account_tickets_loading_one()} />
									<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
										{m.account_tickets_loading_one()}
									</p>
								</div>
							{:else if detailError}
								<p class="text-sm text-[#b91c1c]" role="alert">{detailError}</p>
							{:else if selected}
								<div class="flex w-full flex-wrap items-start justify-between gap-[12px]">
									<div class="min-w-0 flex-1">
										<p
											class="font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-[#0a0a0a]"
										>
											{selected.subject}
										</p>
										<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
											{selected.ticketNumber} · {selected.category} · {priorityLabel(
												selected.priority
											)}
										</p>
									</div>
									<Badge variant="outline">
										{statusLabel(TICKET_STATUS_LABELS, selected.status)}
									</Badge>
								</div>

								<div class="flex w-full flex-col gap-[12px]">
									{#each selected.messages as message (message.id)}
										<div class="flex w-full flex-col gap-[4px] rounded-[8px] bg-[#f5f5f5] p-[16px]">
											<div class="flex flex-wrap items-center justify-between gap-[8px]">
												<p
													class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
												>
													{message.senderName ?? message.senderEmail ?? m.account_tickets_support()}
												</p>
												<p class="font-['Geist:Regular'] text-[12px] leading-[16px] text-[#737373]">
													{formatDateTime(message.createdAt) || '—'}
												</p>
											</div>
											<p
												class="font-['Geist:Regular'] text-[16px] leading-[24px] whitespace-pre-wrap text-[#0a0a0a]"
											>
												{message.body}
											</p>
										</div>
									{/each}
								</div>

								<form class="flex w-full flex-col gap-[8px]" onsubmit={submitReply}>
									<Label for="ticket-reply">{m.account_tickets_reply()}</Label>
									<Textarea
										id="ticket-reply"
										bind:value={reply}
										placeholder={m.account_tickets_reply_placeholder()}
									/>
									{#if replyError}
										<p class="text-sm text-[#b91c1c]" role="alert">{replyError}</p>
									{/if}
									<div>
										<Button type="submit" disabled={replying}>
											{replying ? m.account_tickets_sending() : m.account_tickets_send_reply()}
										</Button>
									</div>
								</form>
							{:else}
								<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
									{m.account_tickets_select_to_read()}
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<SiteFooter />
</div>
