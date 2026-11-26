<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { ArrowRight, UserRound } from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import CheckoutSteps from '#lib/frontend/modules/commerce/components/CheckoutSteps.svelte';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { checkout } from '#lib/frontend/modules/commerce/checkout.svelte.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { validateAccountForm } from '#lib/frontend/modules/commerce/account-form.ts';
	import type { AccountFieldType } from '#lib/frontend/modules/commerce/models.ts';

	let values = $state<Record<string, string>>({});
	let errors = $state<Record<string, string>>({});
	let ready = $state(false);

	const fields = $derived(site.accountForm);

	const inputTypes: Partial<Record<AccountFieldType, string>> = {
		email: 'email',
		tel: 'tel'
	};

	function update(id: string, value: string) {
		values[id] = value;
		if (errors[id]) {
			const { [id]: _removed, ...rest } = errors;
			errors = rest;
		}
	}

	async function continueToPayment(event: SubmitEvent) {
		event.preventDefault();

		errors = validateAccountForm(fields, values);
		if (Object.keys(errors).length > 0) {
			document.getElementById(`account-${Object.keys(errors)[0]}`)?.focus();
			return;
		}

		checkout.setAccountDetails(values);
		await goto('/checkout/payment');
	}

	async function init() {
		checkout.load();
		await Promise.all([cart.refresh(), site.ensure()]);

		if (site.storefrontLayout !== 'topup') {
			await goto('/checkout/address', { replaceState: true });
			return;
		}

		values = { ...checkout.accountDetails };
		ready = true;
	}

	onMount(() => {
		void init();
	});
</script>

<div
	class="relative flex size-full flex-col items-center bg-background"
	data-name="Shopix - Account details"
>
	<SiteHeader />
	<div class="flex w-full flex-col items-center bg-white py-10 sm:py-14">
		<main class="mx-auto w-full max-w-[1280px] px-4 sm:px-8">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
					{m.checkout_account_title()}
				</h1>
				<p class="text-sm text-muted-foreground">
					{m.checkout_account_subtitle()}
				</p>
			</div>

			<CheckoutSteps current="details" />

			{#if !ready}
				<div
					class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
					aria-busy="true"
					aria-live="polite"
				>
					<Skeleton class="h-80 w-full rounded-xl" />
					<Skeleton class="h-96 w-full rounded-xl" />
				</div>
			{:else if cart.items.length === 0}
				<Card.Root class="mt-8">
					<Card.Content class="flex flex-col items-center gap-4 py-12 text-center">
						<Card.Title class="text-lg">{m.cart_empty_title()}</Card.Title>
						<Card.Description>{m.checkout_address_empty_description()}</Card.Description>
						<Button href="/products">{m.common_browse_products()}</Button>
					</Card.Content>
				</Card.Root>
			{:else}
				<form
					class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
					novalidate
					onsubmit={continueToPayment}
				>
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<UserRound class="size-4" aria-hidden="true" />
								{m.checkout_account_card_title()}
							</Card.Title>
							<Card.Description>{m.checkout_account_card_description()}</Card.Description>
						</Card.Header>
						<Card.Content>
							{#if fields.length === 0}
								<p class="text-sm text-muted-foreground">{m.checkout_account_no_fields()}</p>
							{:else}
								<Field.Group>
									{#each fields as field (field.id)}
										{@const id = `account-${field.id}`}
										{@const fieldError = errors[field.id]}
										<Field.Field data-invalid={fieldError ? true : undefined}>
											<Field.Label for={id}>
												{field.label}
												{#if field.required}
													<span class="text-destructive" aria-hidden="true">*</span>
												{/if}
											</Field.Label>
											{#if field.type === 'select'}
												<Select.Root
													type="single"
													value={values[field.id] ?? ''}
													onValueChange={(value) => update(field.id, value)}
												>
													<Select.Trigger
														{id}
														class="w-full"
														aria-invalid={fieldError ? true : undefined}
													>
														{values[field.id] || field.placeholder || m.checkout_account_select()}
													</Select.Trigger>
													<Select.Content>
														{#each field.options as option (option)}
															<Select.Item value={option} label={option}>{option}</Select.Item>
														{/each}
													</Select.Content>
												</Select.Root>
											{:else if field.type === 'textarea'}
												<Textarea
													{id}
													value={values[field.id] ?? ''}
													oninput={(event) => update(field.id, event.currentTarget.value)}
													placeholder={field.placeholder}
													required={field.required}
													aria-invalid={fieldError ? true : undefined}
												/>
											{:else}
												<Input
													{id}
													type={inputTypes[field.type] ?? 'text'}
													inputmode={field.type === 'number' ? 'decimal' : undefined}
													value={values[field.id] ?? ''}
													oninput={(event) => update(field.id, event.currentTarget.value)}
													placeholder={field.placeholder}
													required={field.required}
													aria-invalid={fieldError ? true : undefined}
												/>
											{/if}
											{#if field.helpText}
												<Field.Description>{field.helpText}</Field.Description>
											{/if}
											{#if fieldError}
												<Field.Error>{fieldError}</Field.Error>
											{/if}
										</Field.Field>
									{/each}
								</Field.Group>
							{/if}
						</Card.Content>
					</Card.Root>

					<Card.Root class="lg:sticky lg:top-24">
						<Card.Header>
							<Card.Title>{m.cart_order_summary()}</Card.Title>
							<Card.Description>{m.cart_items_in_cart({ count: cart.count })}</Card.Description>
						</Card.Header>
						<Card.Content class="flex flex-col gap-4">
							{#each cart.items as item (item.id)}
								<div class="flex items-center gap-4">
									<div class="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
										{#if item.imageUrl}
											<img
												src={item.imageUrl}
												alt={item.productName}
												loading="lazy"
												class="size-full object-contain p-1.5"
											/>
										{:else}
											<ImagePlaceholder class="size-full" label={item.productName} />
										{/if}
									</div>
									<div class="flex min-w-0 flex-1 flex-col gap-0.5">
										<p class="truncate text-sm font-semibold text-foreground">
											{item.productName}
										</p>
										<p class="truncate text-xs text-muted-foreground">{item.variantName}</p>
										<p class="text-xs font-medium text-muted-foreground">
											{formatMoney(item.unitPrice, cart.currency)} × {item.quantity}
										</p>
									</div>
								</div>
							{/each}

							<Separator />

							<dl class="flex flex-col gap-2.5 text-sm">
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.common_subtotal()}</dt>
									<dd class="font-medium text-foreground">
										{formatMoney(cart.subtotal, cart.currency)}
									</dd>
								</div>
								<div class="flex items-start justify-between gap-4">
									<dt class="text-muted-foreground">{m.cart_discount()}</dt>
									<dd class="font-medium text-foreground">
										{formatMoney(cart.discount, cart.currency)}
									</dd>
								</div>
							</dl>

							<Separator />

							<div
								class="flex items-start justify-between gap-4 text-base font-semibold text-foreground"
							>
								<span>{m.cart_total_payable()}</span>
								<span>{formatMoney(cart.total, cart.currency)}</span>
							</div>
						</Card.Content>
						<Card.Footer>
							<Button type="submit" size="lg" class="h-10 w-full">
								{m.checkout_account_continue()}
								<ArrowRight class="size-4" />
							</Button>
						</Card.Footer>
					</Card.Root>
				</form>
			{/if}
		</main>
	</div>
	<SiteFooter />
</div>
