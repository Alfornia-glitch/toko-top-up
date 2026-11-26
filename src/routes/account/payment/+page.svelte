<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import {
		listPaymentMethods,
		createPaymentMethod,
		updatePaymentMethod,
		deletePaymentMethod,
		type PaymentForm,
		isUnauthorized
	} from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Checkbox } from '#lib/frontend/components/ui/checkbox/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';

	import type { PaymentMethod } from '#frontend/modules/commerce/models.ts';

	const emptyForm = (): PaymentForm => ({
		brand: '',
		last4: '',
		expMonth: '',
		expYear: '',
		isDefault: false
	});

	const imgLeftIcon = '/assets/2a986.svg';

	let methods = $state<PaymentMethod[]>([]);
	let loading = $state(true);
	let loadError = $state('');
	let formError = $state('');
	let saving = $state(false);
	let busyId = $state<string | null>(null);

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let form = $state<PaymentForm>(emptyForm());

	const formTitle = $derived(editingId ? m.account_payment_edit() : m.account_payment_add());

	function redirectToLogin(): void {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function failureMessage(cause: unknown): string {
		if (isUnauthorized(cause)) {
			redirectToLogin();
			return '';
		}

		return errorMessage(cause, 'common_something_went_wrong');
	}

	function expiry(method: PaymentMethod): string {
		return `${String(method.expMonth).padStart(2, '0')}/${String(method.expYear).slice(-2)}`;
	}

	async function loadMethods(): Promise<void> {
		loading = true;
		loadError = '';

		try {
			methods = await listPaymentMethods();
		} catch (cause) {
			loadError = failureMessage(cause);
		} finally {
			loading = false;
		}
	}

	function startAdd(): void {
		editingId = null;
		form = emptyForm();
		formError = '';
		formOpen = true;
	}

	function startEdit(method: PaymentMethod): void {
		editingId = method.id;
		form = {
			brand: method.brand,
			last4: method.last4,
			expMonth: String(method.expMonth),
			expYear: String(method.expYear),
			isDefault: method.isDefault
		};
		formError = '';
		formOpen = true;
	}

	function closeForm(): void {
		formOpen = false;
		editingId = null;
		formError = '';
		form = emptyForm();
	}

	function validate(source: PaymentForm): string {
		if (!source.brand.trim()) return m.account_payment_brand_required();
		if (!/^\d{4}$/.test(source.last4.trim())) return m.account_payment_last4_invalid();

		const month = Number(source.expMonth);
		if (!Number.isInteger(month) || month < 1 || month > 12) {
			return m.account_payment_month_invalid();
		}

		const year = Number(source.expYear);
		if (!Number.isInteger(year) || year < 2000 || year > 2100) {
			return m.account_payment_year_invalid();
		}

		return '';
	}

	async function submitForm(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		formError = validate(form);
		if (formError) return;

		saving = true;

		try {
			const body = {
				brand: form.brand.trim(),
				last4: form.last4.trim(),
				expMonth: Number(form.expMonth),
				expYear: Number(form.expYear),
				isDefault: form.isDefault
			};

			if (editingId) {
				await updatePaymentMethod(editingId, body);
			} else {
				await createPaymentMethod(body);
			}

			closeForm();
			await loadMethods();
		} catch (cause) {
			formError = failureMessage(cause);
		} finally {
			saving = false;
		}
	}

	async function setDefault(method: PaymentMethod): Promise<void> {
		busyId = method.id;
		loadError = '';

		try {
			await updatePaymentMethod(method.id, {
				brand: method.brand,
				last4: method.last4,
				expMonth: method.expMonth,
				expYear: method.expYear,
				isDefault: true
			});
			await loadMethods();
		} catch (cause) {
			loadError = failureMessage(cause);
		} finally {
			busyId = null;
		}
	}

	async function removeMethod(method: PaymentMethod): Promise<void> {
		if (!confirm(m.account_payment_remove_confirm({ brand: method.brand, last4: method.last4 })))
			return;

		busyId = method.id;
		loadError = '';

		try {
			await deletePaymentMethod(method.id);
			await loadMethods();
		} catch (cause) {
			loadError = failureMessage(cause);
		} finally {
			busyId = null;
		}
	}

	onMount(() => {
		void loadMethods();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Payment"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white py-[56px] max-[480px]:py-9"
		data-name="Payment"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 content-stretch items-start gap-[24px] px-[32px] max-[480px]:px-3.5"
			data-name="Flex Horizontal"
		>
			<AccountSidebar />
			<div
				class="relative flex w-[893px] max-w-full shrink-0 flex-col content-stretch items-start gap-[14px]"
				data-name="Flex Vertical"
			>
				<p
					class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
				>
					{m.common_payment()}
				</p>

				{#if loadError}
					<p class="w-full text-[14px] leading-[20px] text-[#dc2626]">{loadError}</p>
				{/if}

				{#if formOpen}
					<form
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] rounded-[14px] bg-white p-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
						data-name="Card"
						onsubmit={submitForm}
					>
						<p
							class="font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold text-[#0a0a0a]"
						>
							{formTitle}
						</p>
						<div class="grid w-full gap-[16px] sm:grid-cols-2">
							<div class="grid gap-[6px]">
								<Label for="payment-brand">{m.account_payment_brand()}</Label>
								<Input
									id="payment-brand"
									bind:value={form.brand}
									placeholder="Visa"
									autocomplete="organization"
									required
								/>
							</div>
							<div class="grid gap-[6px]">
								<Label for="payment-last4">{m.account_payment_last4()}</Label>
								<Input
									id="payment-last4"
									bind:value={form.last4}
									placeholder="4242"
									inputmode="numeric"
									maxlength={4}
									pattern="\d{4}"
									autocomplete="cc-number"
									required
								/>
							</div>
							<div class="grid gap-[6px]">
								<Label for="payment-exp-month">{m.account_payment_exp_month()}</Label>
								<Input
									id="payment-exp-month"
									type="number"
									min={1}
									max={12}
									bind:value={form.expMonth}
									placeholder="12"
									required
								/>
							</div>
							<div class="grid gap-[6px]">
								<Label for="payment-exp-year">{m.account_payment_exp_year()}</Label>
								<Input
									id="payment-exp-year"
									type="number"
									min={2000}
									max={2100}
									bind:value={form.expYear}
									placeholder="2030"
									required
								/>
							</div>
						</div>
						<div class="flex items-center gap-[8px]">
							<Checkbox id="payment-default" bind:checked={form.isDefault} />
							<Label for="payment-default" class="font-normal"
								>{m.account_payment_set_default_label()}</Label
							>
						</div>
						{#if formError}
							<p class="text-[14px] leading-[20px] text-[#dc2626]">{formError}</p>
						{/if}
						<div class="flex items-center gap-[8px]">
							<Button type="submit" disabled={saving}>
								{#if saving}
									<Spinner />
									{m.common_saving()}
								{:else}
									{editingId ? m.common_save_changes() : m.account_payment_add()}
								{/if}
							</Button>
							<Button type="button" variant="outline" onclick={closeForm} disabled={saving}>
								{m.common_cancel()}
							</Button>
						</div>
					</form>
				{/if}

				{#if loading}
					<div class="flex w-full items-center justify-center py-[24px]">
						<Spinner class="size-6" aria-label={m.account_payment_loading()} />
					</div>
				{:else}
					<div
						class="relative flex w-full shrink-0 flex-wrap content-start items-start gap-[14px]"
						data-name="Flex Horizontal"
					>
						{#if methods.length === 0}
							<div
								class="relative flex min-w-[300px] flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
								data-name="Card"
							>
								<div class="px-[16px]" data-name="card-body">
									<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
										{m.account_payment_empty()}
									</p>
								</div>
							</div>
						{/if}

						{#each methods as method (method.id)}
							<div
								class="relative flex min-w-[300px] flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
								data-name="Card"
							>
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] px-[16px]"
									data-name="card-body"
								>
									<div
										class="relative flex w-full shrink-0 flex-wrap content-start items-start gap-[24px] rounded-[8px]"
										data-name="Flex Horizontal"
									>
										<div
											class="relative flex min-w-[300px] flex-[1_0_0] flex-col content-stretch items-start gap-[4px] font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word]"
											data-name="Flex Vertical"
										>
											<p class="relative w-full shrink-0 text-[#0a0a0a]">
												{method.brand} •••• {method.last4}
											</p>
											<p class="relative w-full shrink-0 text-[#737373]">
												{m.account_payment_expires({ date: expiry(method) })}
											</p>
										</div>
										{#if method.status === 'expired'}
											<div
												class="relative flex shrink-0 content-stretch items-center justify-center gap-[2px] rounded-[9999px] border border-solid border-[#dc2626] px-[6px] py-[2px]"
												data-name="Outline Badge"
											>
												<p
													class="relative flex shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[16px] font-medium whitespace-nowrap text-[#dc2626]"
												>
													{m.account_payment_expired()}
												</p>
											</div>
										{:else if method.isDefault}
											<div
												class="relative flex shrink-0 content-stretch items-center justify-center gap-[2px] rounded-[9999px] border border-solid border-[#e5e5e5] px-[6px] py-[2px]"
												data-name="Outline Badge"
											>
												<p
													class="relative flex shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[16px] font-medium whitespace-nowrap text-[#0a0a0a]"
												>
													{m.account_payment_default()}
												</p>
											</div>
										{/if}
									</div>
									<div
										class="relative flex w-full shrink-0 flex-wrap content-stretch items-start gap-[16px] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word]"
										data-name="Flex Horizontal"
									>
										<Button
											type="button"
											variant="link"
											class="h-auto p-0 text-[#0a0a0a]"
											onclick={() => startEdit(method)}
										>
											{m.common_edit()}
										</Button>
										<Button
											type="button"
											variant="link"
											class="h-auto p-0 text-[#0a0a0a]"
											disabled={busyId === method.id}
											onclick={() => removeMethod(method)}
										>
											{m.common_remove()}
										</Button>
										{#if !method.isDefault && method.status !== 'expired'}
											<Button
												type="button"
												variant="link"
												class="h-auto p-0 text-[#737373]"
												disabled={busyId === method.id}
												onclick={() => setDefault(method)}
											>
												{m.account_payment_set_default()}
											</Button>
										{/if}
									</div>
								</div>
							</div>
						{/each}

						<button
							type="button"
							class="relative flex h-[172px] min-w-[300px] flex-[1_0_0] cursor-pointer flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
							data-name="Card"
							onclick={startAdd}
						>
							<div
								class="relative flex min-h-px w-full flex-[1_0_0] flex-col content-stretch items-center justify-center px-[16px]"
								data-name="card-body"
							>
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-center gap-[19px] rounded-[8px]"
									data-name="Flex Horizontal"
								>
									<div
										class="relative flex shrink-0 content-stretch items-center rounded-[9999px] border border-solid border-[#e5e5e5] p-[8px]"
										data-name="icon"
									>
										<div class="relative size-[20px] shrink-0" data-name="Left-icon">
											<img
												loading="lazy"
												decoding="async"
												alt=""
												class="absolute inset-0 block size-full max-w-none"
												src={imgLeftIcon}
											/>
										</div>
									</div>
									<p
										class="relative shrink-0 text-center font-['Geist:Medium'] text-[18px] leading-[28px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
									>
										{m.account_payment_add_card()}
									</p>
								</div>
							</div>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
	<SiteFooter />
</div>
