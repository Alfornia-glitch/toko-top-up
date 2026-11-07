<script lang="ts">
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
	import { api, ApiError, unwrap } from '#lib/frontend/modules/shared/http.ts';
	import type {
		OrderDetail,
		OrderSummary,
		ReturnDetail,
		ReturnSummary
	} from '#lib/frontend/modules/commerce/models.ts';

	interface ReturnForm {
		orderItemId: string;
		type: 'return' | 'exchange';
		reason: string;
		note: string;
		resolution: string;
	}

	const typeOptions = [
		{ value: 'return', label: 'Return' },
		{ value: 'exchange', label: 'Exchange' }
	];

	const resolutionOptions = [
		{ value: 'none', label: 'No preference' },
		{ value: 'original_payment', label: 'Original payment' },
		{ value: 'gift_card', label: 'Gift card' },
		{ value: 'card', label: 'Card' }
	];

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
	let form = $state<ReturnForm>({
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

	function isUnauthorized(cause: unknown): boolean {
		if (cause instanceof ApiError && cause.status === 401) {
			redirectToLogin();
			return true;
		}

		return false;
	}

	function errorMessage(cause: unknown, fallback: string): string {
		return cause instanceof Error ? cause.message : fallback;
	}

	function typeLabel(type: string): string {
		return type === 'exchange' ? 'Exchange' : 'Return';
	}

	function resolutionLabel(value: string | null): string {
		return value ? value.replaceAll('_', ' ') : '—';
	}

	function setType(value: string) {
		form.type = value === 'exchange' ? 'exchange' : 'return';
	}

	async function loadReturn(id: string) {
		detailLoading = true;
		detailError = '';

		try {
			const payload = await api.get<{ data: ReturnDetail }>(
				`/api/returns/${encodeURIComponent(id)}`
			);
			selected = unwrap(payload);
		} catch (cause) {
			if (!isUnauthorized(cause)) {
				selected = null;
				detailError = errorMessage(cause, 'Could not load this return');
			}
		} finally {
			detailLoading = false;
		}
	}

	async function refreshReturns() {
		const payload = await api.get<{ data: ReturnSummary[] }>('/api/returns');
		returns = unwrap(payload);
	}

	async function initialize() {
		loading = true;
		error = '';

		try {
			const [returnsPayload, ordersPayload] = await Promise.all([
				api.get<{ data: ReturnSummary[] }>('/api/returns'),
				api.get<{ data: OrderSummary[] }>('/api/orders?page=1&pageSize=100')
			]);

			returns = unwrap(returnsPayload);
			orders = unwrap(ordersPayload);

			if (returns.length > 0) await loadReturn(returns[0].id);
		} catch (cause) {
			if (!isUnauthorized(cause)) {
				error = errorMessage(cause, 'Could not load your returns');
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
			const payload = await api.get<{ data: OrderDetail }>(
				`/api/orders/${encodeURIComponent(value)}`
			);
			selectedOrder = unwrap(payload);

			if (selectedOrder.items.length === 1) {
				form.orderItemId = selectedOrder.items[0].id;
			}
		} catch (cause) {
			if (!isUnauthorized(cause)) {
				formError = errorMessage(cause, 'Could not load the items for this order');
			}
		} finally {
			orderLoading = false;
		}
	}

	async function submitReturn(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (!form.orderItemId) {
			formError = 'Select an order and the item you want to request.';
			return;
		}

		if (!form.reason.trim()) {
			formError = 'Describe the reason for this request.';
			return;
		}

		submitting = true;

		try {
			const payload = await api.post<{ data: ReturnDetail }>('/api/returns', {
				orderItemId: form.orderItemId,
				type: form.type,
				reason: form.reason.trim(),
				note: form.note.trim() || null,
				resolution: form.resolution === 'none' ? null : form.resolution
			});
			const created = unwrap(payload);

			await refreshReturns();
			selected = created;
			selectedOrder = null;
			selectedOrderNumber = '';
			form = { orderItemId: '', type: 'return', reason: '', note: '', resolution: 'none' };
		} catch (cause) {
			if (!isUnauthorized(cause)) {
				formError = errorMessage(cause, 'Could not submit your return request');
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
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Return & Refunds"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white py-[56px]"
		data-name="Return and refund"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 content-stretch items-start gap-[24px] px-[32px]"
			data-name="Flex Horizontal"
		>
			<AccountSidebar />

			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[24px]"
				data-name="Flex Vertical"
			>
				<p
					class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
				>
					Returns &amp; Refunds
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
							Request return
						</p>

						<form class="flex w-full flex-col gap-[16px]" onsubmit={submitReturn}>
							<div class="grid w-full gap-[12px] sm:grid-cols-2">
								<div class="flex flex-col gap-[6px]">
									<Label for="return-order">Order</Label>
									<Select.Root
										type="single"
										value={selectedOrderNumber}
										onValueChange={selectOrder}
									>
										<Select.Trigger id="return-order" class="w-full">
											<Select.Value placeholder="Select an order" />
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
										<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
											You have no orders available for a return request.
										</p>
									{/if}
								</div>

								<div class="flex flex-col gap-[6px]">
									<Label for="return-item">Item</Label>
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
												placeholder={orderLoading ? 'Loading items' : 'Select an item'}
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
									<Label for="return-type">Type</Label>
									<Select.Root type="single" value={form.type} onValueChange={setType}>
										<Select.Trigger id="return-type" class="w-full">
											<Select.Value placeholder="Select a type" />
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
									<Label for="return-resolution">Resolution</Label>
									<Select.Root
										type="single"
										value={form.resolution}
										onValueChange={(value) => (form.resolution = value)}
									>
										<Select.Trigger id="return-resolution" class="w-full">
											<Select.Value placeholder="No preference" />
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
								<Label for="return-reason">Reason</Label>
								<Input
									id="return-reason"
									bind:value={form.reason}
									placeholder="Why do you want to return or exchange this item?"
								/>
							</div>

							<div class="flex flex-col gap-[6px]">
								<Label for="return-note">Note</Label>
								<Textarea
									id="return-note"
									bind:value={form.note}
									placeholder="Anything else we should know?"
								/>
							</div>

							{#if formError}
								<p class="text-sm text-[#b91c1c]" role="alert">{formError}</p>
							{/if}

							<div>
								<Button type="submit" disabled={submitting}>
									{submitting ? 'Submitting' : 'Request return'}
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
						<Spinner class="size-5" aria-label="Loading returns" />
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
							Loading returns
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
				{:else if returns.length === 0}
					<div
						class="relative flex w-full flex-col items-start gap-[12px] rounded-[14px] bg-white px-[24px] py-[32px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<p
							class="font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold text-[#0a0a0a]"
						>
							No returns yet
						</p>
						<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
							Return or exchange requests you create will appear here.
						</p>
						<a
							href="/products"
							class="rounded-[8px] bg-[#171717] px-[16px] py-[10px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#fafafa]"
						>
							Browse products
						</a>
					</div>
				{:else}
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px] px-[24px]"
							data-name="card-body"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
							>
								Your returns
							</p>
							<div class="flex w-full flex-col gap-[8px]">
								{#each returns as entry (entry.id)}
									<button
										type="button"
										class={`flex w-full flex-wrap items-start justify-between gap-[12px] rounded-[8px] border border-[#e5e5e5] p-[16px] text-left transition-colors ${
											selected?.id === entry.id ? 'bg-[#f5f5f5]' : 'bg-white hover:bg-[#fafafa]'
										}`}
										aria-pressed={selected?.id === entry.id}
										onclick={() => loadReturn(entry.id)}
									>
										<div class="min-w-0 flex-1">
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
											>
												{entry.productName}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												SKU: {entry.sku}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												{typeLabel(entry.type)} · {entry.reason}
											</p>
										</div>
										<div class="flex flex-col items-end gap-[4px] text-right">
											<Badge variant="outline">
												{statusLabel(RETURN_STATUS_LABELS, entry.status)}
											</Badge>
											<p
												class="font-['Geist:Medium'] text-[14px] leading-[20px] font-medium text-[#0a0a0a]"
											>
												{entry.refundAmountCents === null
													? '—'
													: formatMoney(entry.refundAmountCents)}
											</p>
											<p class="font-['Geist:Regular'] text-[12px] leading-[16px] text-[#737373]">
												{formatDate(entry.createdAt)}
											</p>
										</div>
									</button>
								{/each}
							</div>
						</div>
					</div>

					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[20px] px-[24px]"
							data-name="card-body"
						>
							<p
								class="relative w-[min-content] min-w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
							>
								Return Progressed
							</p>

							{#if detailLoading}
								<div class="flex items-center gap-[12px]">
									<Spinner class="size-5" aria-label="Loading return" />
									<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
										Loading return
									</p>
								</div>
							{:else if detailError}
								<p class="text-sm text-[#b91c1c]" role="alert">{detailError}</p>
							{:else if selected}
								<div class="flex w-full flex-col gap-[16px]">
									<div class="flex w-full flex-wrap items-start justify-between gap-[12px]">
										<div class="min-w-0 flex-1">
											<p
												class="font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-[#0a0a0a]"
											>
												{selected.productName}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												SKU: {selected.sku}
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												Order #{selected.orderNumber}
											</p>
										</div>
										<div class="flex flex-col items-end gap-[4px] text-right">
											<Badge variant="outline">
												{statusLabel(RETURN_STATUS_LABELS, selected.status)}
											</Badge>
											<p
												class="font-['Geist:SemiBold'] text-[16px] leading-[24px] font-semibold text-[#0a0a0a]"
											>
												{selected.refundAmountCents === null
													? '—'
													: formatMoney(selected.refundAmountCents)}
											</p>
										</div>
									</div>

									<div class="grid w-full gap-[12px] sm:grid-cols-2">
										<div>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												Type
											</p>
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
											>
												{typeLabel(selected.type)}
											</p>
										</div>
										<div>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												Resolution
											</p>
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
											>
												{resolutionLabel(selected.resolution)}
											</p>
										</div>
										<div class="sm:col-span-2">
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												Reason
											</p>
											<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#0a0a0a]">
												{selected.reason}
											</p>
										</div>
										{#if selected.note}
											<div class="sm:col-span-2">
												<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
													Note
												</p>
												<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#0a0a0a]">
													{selected.note}
												</p>
											</div>
										{/if}
									</div>

									{#if selected.images.length > 0}
										<div class="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
											{#each selected.images as image (image.id)}
												<img
													src={image.url}
													alt=""
													class="aspect-square w-full rounded-[8px] object-cover"
												/>
											{/each}
										</div>
									{/if}

									<div class="flex w-full flex-col gap-[8px] border-l border-[#e5e5e5] pl-[16px]">
										<div>
											<p
												class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
											>
												Requested
											</p>
											<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
												{formatDateTime(selected.createdAt) || '—'}
											</p>
										</div>
										{#if selected.updatedAt !== selected.createdAt}
											<div>
												<p
													class="font-['Geist:Medium'] text-[16px] leading-[24px] font-medium text-[#0a0a0a]"
												>
													{statusLabel(RETURN_STATUS_LABELS, selected.status)}
												</p>
												<p class="font-['Geist:Regular'] text-[14px] leading-[20px] text-[#737373]">
													{formatDateTime(selected.updatedAt) || '—'}
												</p>
											</div>
										{/if}
									</div>
								</div>
							{:else}
								<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
									Select a return to see its progress.
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<a
					href="/account/support-tickets"
					class="relative flex w-full shrink-0 flex-col content-stretch items-start rounded-[8px] bg-[#f5f5f5] p-[16px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex w-full shrink-0 content-stretch items-center justify-between"
						data-name="Flex Horizontal"
					>
						<p
							class="relative shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							Need any help?
						</p>
						<span
							class="relative flex h-[24px] shrink-0 content-stretch items-center justify-center gap-[4px] rounded-[9999px] bg-[#171717] px-[12px] py-[4px] font-['Geist:Medium'] text-[12px] leading-[16px] font-medium whitespace-nowrap text-[#fafafa]"
						>
							Contact Support
						</span>
					</div>
				</a>
			</div>
		</div>
	</div>
	<SiteFooter />
</div>
