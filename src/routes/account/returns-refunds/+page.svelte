<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { enumLabel, errorMessage } from '#lib/frontend/i18n/index.ts';
	import {
		listOrders,
		getOrder,
		listReturns,
		getReturn,
		createReturn,
		isUnauthorized,
		type ReturnRequestForm
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
	import { RETURN_STATUS_LABELS, statusLabel } from '#lib/frontend/content/status.ts';
	import {
		formatDate,
		formatDateTime,
		formatMoney
	} from '#lib/frontend/modules/commerce/format.ts';
	import { unwrap } from '#lib/frontend/modules/shared/http.ts';
	import type {
		OrderDetail,
		OrderSummary,
		ReturnDetail,
		ReturnSummary
	} from '#lib/frontend/modules/commerce/models.ts';

	const typeOptions = $derived([
		{ value: 'return', label: enumLabel('return_type', 'return') },
		{ value: 'exchange', label: enumLabel('return_type', 'exchange') }
	]);

	const resolutionOptions = $derived([
		{ value: 'none', label: m.account_shared_resolution_none() },
		{ value: 'original_payment', label: enumLabel('return_resolution', 'original_payment') },
		{ value: 'gift_card', label: enumLabel('return_resolution', 'gift_card') },
		{ value: 'card', label: enumLabel('return_resolution', 'card') }
	]);

	let returns = $state<ReturnSummary[]>([]);
	let selected = $state<ReturnDetail | null>(null);
	let loading = $state(true);
	let detailLoading = $state(false);
	let error = $state('');
	let detailError = $state('');
	let formError = $state('');
	let submitting = $state(false);
	let orders = $state<OrderSummary[]>([]);
	let selectedOrder = $state<OrderDetail | null>(null);
	let selectedOrderNumber = $state('');
	let orderLoading = $state(false);
	let form = $state<ReturnRequestForm>({
		orderItemId: '',
		type: 'return',
		reason: '',
		note: '',
		resolution: 'none'
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

	function typeLabel(type: string): string {
		return enumLabel('return_type', type === 'exchange' ? 'exchange' : 'return');
	}

	function resolutionLabel(value: string | null): string {
		return value ? enumLabel('return_resolution', value) : '—';
	}

	function setType(value: string) {
		form.type = value === 'exchange' ? 'exchange' : 'return';
	}

	async function loadReturn(id: string) {
		detailLoading = true;
		detailError = '';

		try {
			selected = await getReturn(id);
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				selected = null;
				detailError = errorMessage(cause, 'account_returns_load_one_failed');
			}
		} finally {
			detailLoading = false;
		}
	}

	async function refreshReturns() {
		returns = await listReturns();
	}

	async function initialize() {
		loading = true;
		error = '';

		try {
			const [returnsPayload, ordersPayload] = await Promise.all([
				listReturns(),
				listOrders(1, 100)
			]);

			returns = returnsPayload;
			orders = ordersPayload.data;

			if (returns.length > 0) await loadReturn(returns[0].id);
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				error = errorMessage(cause, 'account_returns_load_failed');
			}
		} finally {
			loading = false;
		}
	}

	async function selectOrder(value: string) {
		selectedOrderNumber = value;
		selectedOrder = null;
		form.orderItemId = '';
		formError = '';

		if (!value) return;

		orderLoading = true;

		try {
			selectedOrder = await getOrder(value);

			if (selectedOrder.items.length === 1) {
				form.orderItemId = selectedOrder.items[0].id;
			}
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				formError = errorMessage(cause, 'account_shared_load_order_items_failed');
			}
		} finally {
			orderLoading = false;
		}
	}

	async function submitReturn(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (!form.orderItemId) {
			formError = m.account_returns_select_required();
			return;
		}

		if (!form.reason.trim()) {
			formError = m.account_returns_reason_required();
			return;
		}

		submitting = true;

		try {
			const created = await createReturn({
				orderItemId: form.orderItemId,
				type: form.type,
				reason: form.reason.trim(),
				note: form.note.trim() || null,
				resolution: form.resolution === 'none' ? null : form.resolution
			});

			await refreshReturns();
			selected = created;
			selectedOrder = null;
			selectedOrderNumber = '';
			form = { orderItemId: '', type: 'return', reason: '', note: '', resolution: 'none' };
		} catch (cause) {
			if (!redirectIfUnauthorized(cause)) {
				formError = errorMessage(cause, 'account_return_item_submit_failed');
			}
		} finally {
			submitting = false;
		}
	}

	onMount(() => {
		void initialize();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-card"
	data-name="Shopix - Return & Refunds"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-card py-[56px] max-[480px]:py-9"
		data-name="Return and refund"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 content-stretch items-start gap-[24px] px-[32px] max-[480px]:px-3.5"
			data-name="Flex Horizontal"
		>
			<AccountSidebar />

			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[24px]"
				data-name="Flex Vertical"
			>
				<p
					class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
				>
					{m.account_returns_title()}
				</p>

				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-card py-[24px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
					data-name="Card"
				>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] px-[24px]"
						data-name="card-body"
					>
						<p
							class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
						>
							{m.account_returns_request()}
						</p>

						<form class="flex w-full flex-col gap-[16px]" onsubmit={submitReturn}>
							<div class="grid w-full gap-[12px] sm:grid-cols-2">
								<div class="flex flex-col gap-[6px]">
									<Label for="return-order">{m.common_order()}</Label>
									<Select.Root
										type="single"
										value={selectedOrderNumber}
										onValueChange={selectOrder}
									>
										<Select.Trigger id="return-order" class="w-full">
											<Select.Value placeholder={m.account_shared_select_order()} />
										</Select.Trigger>
										<Select.Content>
											{#each orders as entry (entry.id)}
												<Select.Item value={entry.orderNumber} label={entry.orderNumber}>
													{entry.orderNumber}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
									{#if orders.length === 0}
										<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
											{m.account_returns_no_orders()}
										</p>
									{/if}
								</div>

								<div class="flex flex-col gap-[6px]">
									<Label for="return-item">{m.account_returns_item()}</Label>
									<Select.Root
										type="single"
										value={form.orderItemId}
										onValueChange={(value) => (form.orderItemId = value)}
									>
										<Select.Trigger
											id="return-item"
											class="w-full"
											disabled={!selectedOrder || orderLoading}
										>
											<Select.Value
												placeholder={orderLoading
													? m.account_shared_loading_items()
													: m.account_returns_select_item()}
											/>
										</Select.Trigger>
										<Select.Content>
											{#each selectedOrder?.items ?? [] as item (item.id)}
												<Select.Item value={item.id} label={item.productName}>
													{item.productName} · {item.sku}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>

								<div class="flex flex-col gap-[6px]">
									<Label for="return-type">{m.account_returns_type()}</Label>
									<Select.Root type="single" value={form.type} onValueChange={setType}>
										<Select.Trigger id="return-type" class="w-full">
											<Select.Value placeholder={m.account_returns_select_type()} />
										</Select.Trigger>
										<Select.Content>
											{#each typeOptions as option (option.value)}
												<Select.Item value={option.value} label={option.label}>
													{option.label}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>

								<div class="flex flex-col gap-[6px]">
									<Label for="return-resolution">{m.account_returns_resolution()}</Label>
									<Select.Root
										type="single"
										value={form.resolution}
										onValueChange={(value) => (form.resolution = value)}
									>
										<Select.Trigger id="return-resolution" class="w-full">
											<Select.Value placeholder={m.account_shared_resolution_none()} />
										</Select.Trigger>
										<Select.Content>
											{#each resolutionOptions as option (option.value)}
												<Select.Item value={option.value} label={option.label}>
													{option.label}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>

							<div class="flex flex-col gap-[6px]">
								<Label for="return-reason">{m.account_returns_reason()}</Label>
								<Input
									id="return-reason"
									bind:value={form.reason}
									placeholder={m.account_returns_reason_placeholder()}
								/>
							</div>

							<div class="flex flex-col gap-[6px]">
								<Label for="return-note">{m.account_returns_note()}</Label>
								<Textarea
									id="return-note"
									bind:value={form.note}
									placeholder={m.account_returns_note_placeholder()}
								/>
							</div>

							{#if formError}
								<p class="text-sm text-destructive" role="alert">{formError}</p>
							{/if}

							<div>
								<Button type="submit" disabled={submitting}>
									{submitting ? m.account_shared_submitting() : m.account_returns_request()}
								</Button>
							</div>
						</form>
					</div>
				</div>

				{#if loading}
					<div
						class="relative flex w-full items-center justify-center gap-3 rounded-[14px] bg-card px-[24px] py-[64px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
						data-name="Card"
					>
						<Spinner class="size-5" aria-label={m.account_returns_loading()} />
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
							{m.account_returns_loading()}
						</p>
					</div>
				{:else if error}
					<div
						class="relative flex w-full rounded-[14px] border border-destructive/30 bg-destructive/10 px-[24px] py-[16px] text-destructive"
						data-name="Card"
						role="alert"
					>
						{error}
					</div>
				{:else if returns.length === 0}
					<div
						class="relative flex w-full flex-col items-start gap-[12px] rounded-[14px] bg-card px-[24px] py-[32px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
						data-name="Card"
					>
						<p
							class="font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-foreground"
						>
							{m.account_returns_empty_title()}
						</p>
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
							{m.account_returns_empty_description()}
						</p>
						<a
							href="/products"
							class="rounded-[8px] bg-primary px-[16px] py-[10px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-primary-foreground"
						>
							{m.common_browse_products()}
						</a>
					</div>
				{:else}
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-card py-[24px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px] px-[24px]"
							data-name="card-body"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
							>
								{m.account_returns_list_title()}
							</p>
							<div class="flex w-full flex-col gap-[8px]">
								{#each returns as entry (entry.id)}
									<button
										type="button"
										class={`flex w-full flex-wrap items-start justify-between gap-[12px] rounded-[8px] border border-border p-[16px] text-left transition-colors ${
											selected?.id === entry.id ? 'bg-muted' : 'bg-card hover:bg-primary-foreground'
										}`}
										aria-pressed={selected?.id === entry.id}
										onclick={() => loadReturn(entry.id)}
									>
										<div class="min-w-0 flex-1">
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
											>
												{entry.productName}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{m.account_shared_sku({ sku: entry.sku })}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{typeLabel(entry.type)} · {entry.reason}
											</p>
										</div>
										<div class="flex flex-col items-end gap-[4px] text-right">
											<Badge variant="outline">
												{statusLabel(RETURN_STATUS_LABELS, entry.status)}
											</Badge>
											<p
												class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-foreground"
											>
												{entry.refundAmount === null ? '—' : formatMoney(entry.refundAmount)}
											</p>
											<p class="font-['Geist:Regular'] text-[12px] leading-[16px] text-muted-foreground">
												{formatDate(entry.createdAt)}
											</p>
										</div>
									</button>
								{/each}
							</div>
						</div>
					</div>

					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-card py-[24px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[20px] px-[24px]"
							data-name="card-body"
						>
							<p
								class="relative w-[min-content] min-w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
							>
								{m.account_returns_progress_title()}
							</p>

							{#if detailLoading}
								<div class="flex items-center gap-[12px]">
									<Spinner class="size-5" aria-label={m.account_returns_loading_one()} />
									<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
										{m.account_returns_loading_one()}
									</p>
								</div>
							{:else if detailError}
								<p class="text-sm text-destructive" role="alert">{detailError}</p>
							{:else if selected}
								<div class="flex w-full flex-col gap-[16px]">
									<div class="flex w-full flex-wrap items-start justify-between gap-[12px]">
										<div class="min-w-0 flex-1">
											<p
												class="font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-foreground"
											>
												{selected.productName}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{m.account_shared_sku({ sku: selected.sku })}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{m.account_shared_order_number({ orderNumber: selected.orderNumber })}
											</p>
										</div>
										<div class="flex flex-col items-end gap-[4px] text-right">
											<Badge variant="outline">
												{statusLabel(RETURN_STATUS_LABELS, selected.status)}
											</Badge>
											<p
												class="font-['Geist:SemiBold'] text-[16px] leading-[24px] font-semibold text-foreground"
											>
												{selected.refundAmount === null ? '—' : formatMoney(selected.refundAmount)}
											</p>
										</div>
									</div>

									<div class="grid w-full gap-[12px] sm:grid-cols-2">
										<div>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{m.account_returns_type()}
											</p>
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
											>
												{typeLabel(selected.type)}
											</p>
										</div>
										<div>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{m.account_returns_resolution()}
											</p>
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
											>
												{resolutionLabel(selected.resolution)}
											</p>
										</div>
										<div class="sm:col-span-2">
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{m.account_returns_reason()}
											</p>
											<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-foreground">
												{selected.reason}
											</p>
										</div>
										{#if selected.note}
											<div class="sm:col-span-2">
												<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
													{m.account_returns_note()}
												</p>
												<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-foreground">
													{selected.note}
												</p>
											</div>
										{/if}
									</div>

									{#if selected.images.length > 0}
										<div class="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
											{#each selected.images as image (image.id)}
												<img
													loading="lazy"
													decoding="async"
													src={image.url}
													alt=""
													class="aspect-square w-full rounded-[8px] object-cover"
												/>
											{/each}
										</div>
									{/if}

									<div class="flex w-full flex-col gap-[8px] border-l border-border pl-[16px]">
										<div>
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
											>
												{m.account_returns_requested()}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
												{formatDateTime(selected.createdAt) || '—'}
											</p>
										</div>
										{#if selected.updatedAt !== selected.createdAt}
											<div>
												<p
													class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-foreground"
												>
													{statusLabel(RETURN_STATUS_LABELS, selected.status)}
												</p>
												<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-muted-foreground">
													{formatDateTime(selected.updatedAt) || '—'}
												</p>
											</div>
										{/if}
									</div>
								</div>
							{:else}
								<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
									{m.account_returns_select_to_view()}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<a
					href="/account/support-tickets"
					class="relative flex w-full shrink-0 flex-col content-stretch items-start rounded-[8px] bg-muted p-[16px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex w-full shrink-0 content-stretch items-center justify-between"
						data-name="Flex Horizontal"
					>
						<p
							class="relative shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-foreground"
						>
							{m.account_returns_help()}
						</p>
						<span
							class="relative flex h-[24px] shrink-0 content-stretch items-center justify-center gap-[4px] rounded-[9999px] bg-primary px-[12px] py-[4px] font-['Geist:Medium'] text-[12px] leading-[16px] font-medium whitespace-nowrap text-primary-foreground"
						>
							{m.account_returns_contact_support()}
						</span>
					</div>
				</a>
			</div>
		</div>
	</div>
	<SiteFooter />
</div>
