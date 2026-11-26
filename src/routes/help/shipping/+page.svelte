<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { ChevronDown, Package } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import * as Breadcrumb from '#lib/frontend/components/ui/breadcrumb/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Collapsible from '#lib/frontend/components/ui/collapsible/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';

	const faqs = [
		{
			id: 'processing',
			question: m.storefront_shipping_faq_processing_q(),
			answer: m.storefront_shipping_faq_processing_a()
		},
		{
			id: 'free-shipping',
			question: m.storefront_shipping_faq_free_q(),
			answer: m.storefront_shipping_faq_free_a()
		},
		{
			id: 'express',
			question: m.storefront_shipping_faq_express_q(),
			answer: m.storefront_shipping_faq_express_a()
		},
		{
			id: 'international',
			question: m.storefront_shipping_faq_international_q(),
			answer: m.storefront_shipping_faq_international_a()
		},
		{
			id: 'delayed',
			question: m.storefront_shipping_faq_delayed_q(),
			answer: m.storefront_shipping_faq_delayed_a()
		},
		{
			id: 'address',
			question: m.storefront_shipping_faq_address_q(),
			answer: m.storefront_shipping_faq_address_a()
		},
		{
			id: 'tracking',
			question: m.storefront_shipping_faq_tracking_q(),
			answer: m.storefront_shipping_faq_tracking_a()
		},
		{
			id: 'damaged',
			question: m.storefront_shipping_faq_damaged_q(),
			answer: m.storefront_shipping_faq_damaged_a()
		}
	];

	function costLabel(price: number): string {
		return price === 0 ? m.common_free() : formatMoney(price, site.currency);
	}

	onMount(() => {
		void site.ensure();
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />
	<main class="flex-1">
		<div class="mx-auto w-full max-w-[1280px] px-4 pt-8 pb-16 sm:px-8">
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">{m.common_home()}</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/help">{m.storefront_pp_breadcrumb_help()}</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{m.common_shipping()}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<section
				class="mt-6 flex flex-col gap-6 rounded-2xl border border-[#e5e5e5] bg-[#f5f5f5] p-6 sm:p-10 md:flex-row md:items-center md:justify-between"
			>
				<div class="flex max-w-2xl flex-col gap-3">
					<h1
						class="text-3xl font-bold tracking-tight text-[#0a0a0a] max-[480px]:text-2xl max-[480px]:leading-8 sm:text-4xl"
					>
						{m.storefront_shipping_title()}
					</h1>
					<p class="text-base leading-relaxed text-[#737373]">
						{m.storefront_shipping_intro()}
					</p>
				</div>
				<div class="flex shrink-0">
					<Button href="/account/order-tracking" size="lg">
						<Package />
						{m.storefront_shipping_track_order()}
					</Button>
				</div>
			</section>

			<section class="mt-12" aria-labelledby="delivery-options-heading">
				<div class="mb-4 flex flex-col gap-1">
					<h2 id="delivery-options-heading" class="text-2xl font-semibold text-[#0a0a0a]">
						{m.storefront_shipping_options_title()}
					</h2>
					<p class="text-sm text-[#737373]">
						{m.storefront_shipping_options_desc()}
					</p>
				</div>

				<Card.Root>
					<Card.Content class="pt-4">
						{#if site.loading && !site.settings}
							<div class="flex flex-col gap-3 py-2" aria-busy="true" aria-live="polite">
								<Skeleton class="h-5 w-2/5" />
								<Skeleton class="h-10 w-full" />
								<Skeleton class="h-10 w-full" />
								<Skeleton class="h-10 w-3/4" />
							</div>
						{:else if site.shipping.length === 0}
							<div class="flex flex-col items-center gap-2 py-10 text-center">
								<Package class="size-8 text-[#737373]" />
								<p class="text-base font-medium text-[#0a0a0a]">
									{m.storefront_shipping_none_title()}
								</p>
								<p class="text-sm text-[#737373]">
									{m.storefront_shipping_none_desc()}
								</p>
							</div>
						{:else}
							<div class="hidden md:block">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>{m.storefront_shipping_col_method()}</Table.Head>
											<Table.Head>{m.storefront_shipping_col_time()}</Table.Head>
											<Table.Head class="text-right">{m.storefront_shipping_col_cost()}</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each site.shipping as option (option.id)}
											<Table.Row>
												<Table.Cell class="py-3 whitespace-normal">
													<div class="flex flex-col gap-1">
														<span class="font-medium text-[#0a0a0a]">{option.label}</span>
														{#if option.description}
															<span class="text-xs text-[#737373]">{option.description}</span>
														{/if}
													</div>
												</Table.Cell>
												<Table.Cell class="py-3 whitespace-normal">
													{m.storefront_shipping_days({ min: option.minDays, max: option.maxDays })}
												</Table.Cell>
												<Table.Cell class="py-3 text-right">
													{#if option.price === 0}
														<Badge variant="secondary">{m.common_free()}</Badge>
													{:else}
														<span class="font-medium text-[#0a0a0a]">
															{costLabel(option.price)}
														</span>
													{/if}
												</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>

							<div class="flex flex-col gap-3 md:hidden">
								{#each site.shipping as option (option.id)}
									<div class="rounded-xl border border-[#e5e5e5] p-4">
										<div class="flex items-start justify-between gap-3">
											<span class="font-medium text-[#0a0a0a]">{option.label}</span>
											{#if option.price === 0}
												<Badge variant="secondary">{m.common_free()}</Badge>
											{:else}
												<span class="shrink-0 font-medium text-[#0a0a0a]">
													{costLabel(option.price)}
												</span>
											{/if}
										</div>
										{#if option.description}
											<p class="mt-1 text-xs text-[#737373]">{option.description}</p>
										{/if}
										<div class="mt-3 flex items-center justify-between text-sm">
											<span class="text-[#737373]">{m.storefront_shipping_col_time()}</span>
											<span class="font-medium text-[#0a0a0a]">
												{m.storefront_shipping_days({ min: option.minDays, max: option.maxDays })}
											</span>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</section>

			<section class="mt-12" aria-labelledby="shipping-faq-heading">
				<div class="mb-4 flex flex-col gap-1">
					<h2 id="shipping-faq-heading" class="text-2xl font-semibold text-[#0a0a0a]">
						{m.storefront_shipping_faq_title()}
					</h2>
					<p class="text-sm text-[#737373]">
						{m.storefront_shipping_faq_desc()}
					</p>
				</div>

				<Card.Root>
					<Card.Content class="p-0">
						<div class="divide-y divide-[#e5e5e5]">
							{#each faqs as faq (faq.id)}
								<Collapsible.Root class="group/collapsible">
									<Collapsible.Trigger
										class="group/trigger flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[#f5f5f5] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:outline-none"
									>
										<span class="text-sm font-medium text-[#0a0a0a] sm:text-base">
											{faq.question}
										</span>
										<ChevronDown
											class="size-4 shrink-0 text-[#737373] transition-transform duration-200 group-data-[state=open]/trigger:rotate-180"
										/>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<p class="px-6 pb-4 text-sm leading-relaxed text-[#737373]">
											{faq.answer}
										</p>
									</Collapsible.Content>
								</Collapsible.Root>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</section>

			<section class="mt-12" aria-labelledby="shipping-help-heading">
				<Card.Root>
					<Card.Content
						class="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between"
					>
						<div class="flex flex-col gap-1">
							<h2 id="shipping-help-heading" class="text-xl font-semibold text-[#0a0a0a]">
								{m.storefront_shipping_help_title()}
							</h2>
							<p class="text-sm text-[#737373]">
								{m.storefront_shipping_help_desc()}
							</p>
						</div>
						<div class="flex flex-col gap-3 sm:flex-row">
							<Button href="/help" variant="outline">{m.storefront_shipping_back_help()}</Button>
							<Button href="/account/support-tickets">{m.storefront_pp_contact_support()}</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</section>
		</div>
	</main>
	<SiteFooter />
</div>
