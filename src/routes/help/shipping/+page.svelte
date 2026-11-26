<script lang="ts">
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
			question: 'How long does order processing take?',
			answer:
				'Orders are picked and packed within 1–2 business days after payment clears. Orders placed before 2 PM local time usually ship the same day, while orders placed on weekends or public holidays ship on the next business day.'
		},
		{
			id: 'free-shipping',
			question: 'When does shipping become free?',
			answer:
				'Standard shipping is free on orders that meet our free-shipping threshold shown at checkout. The discount is applied automatically to your order summary before you pay, so no promo code is needed.'
		},
		{
			id: 'express',
			question: 'Can I upgrade to express delivery?',
			answer:
				'Yes. Express options appear at checkout whenever they are available for your address. Express orders are prioritised and typically arrive in 1–2 business days, with the exact estimate and price shown before you confirm payment.'
		},
		{
			id: 'international',
			question: 'Do you ship internationally?',
			answer:
				'We ship to most countries worldwide. International delivery times vary by destination and customs clearance. Import duties, taxes and brokerage fees are the responsibility of the recipient and are not included in the shipping cost at checkout.'
		},
		{
			id: 'delayed',
			question: 'My package is late. What should I do?',
			answer:
				'If tracking has not updated for 48 hours, or your order is past its estimated delivery window, contact our support team with your order number. We will open a carrier investigation and keep you updated until the parcel is found or a replacement is issued.'
		},
		{
			id: 'address',
			question: 'Can I change my shipping address after ordering?',
			answer:
				'Address changes are possible before the order is packed. Contact support as soon as possible with your order number and the corrected address. Once a parcel is in transit, the carrier may allow a redirect for an additional fee.'
		},
		{
			id: 'tracking',
			question: 'How do I track my order?',
			answer:
				'A tracking link is emailed as soon as your parcel is handed to the carrier. You can also open Order Tracking in your account to see live status updates, the carrier name and the expected delivery date.'
		},
		{
			id: 'damaged',
			question: 'What if my package arrives damaged?',
			answer:
				'Please photograph the packaging and the damaged item, then contact support within 7 days of delivery. We will arrange a replacement or refund once the carrier claim is reviewed, and we may ask you to keep the original packaging for inspection.'
		}
	];

	function costLabel(price: number): string {
		return price === 0 ? 'Free' : formatMoney(price, site.currency);
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
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/help">Help</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Shipping</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<section
				class="mt-6 flex flex-col gap-6 rounded-2xl border border-[#e5e5e5] bg-[#f5f5f5] p-6 sm:p-10 md:flex-row md:items-center md:justify-between"
			>
				<div class="flex max-w-2xl flex-col gap-3">
					<h1 class="text-3xl font-bold tracking-tight text-[#0a0a0a] sm:text-4xl">
						Shipping &amp; delivery
					</h1>
					<p class="text-base leading-relaxed text-[#737373]">
						Everything you need to know about delivery times, tracking your parcel and shipping
						costs. Choose the method that fits your schedule at checkout, then follow your order
						from our warehouse to your door.
					</p>
				</div>
				<div class="flex shrink-0">
					<Button href="/account/order-tracking" size="lg">
						<Package />
						Track an order
					</Button>
				</div>
			</section>

			<section class="mt-12" aria-labelledby="delivery-options-heading">
				<div class="mb-4 flex flex-col gap-1">
					<h2 id="delivery-options-heading" class="text-2xl font-semibold text-[#0a0a0a]">
						Delivery options
					</h2>
					<p class="text-sm text-[#737373]">
						Available methods and estimated delivery windows. Costs are calculated at checkout based
						on your destination.
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
								<p class="text-base font-medium text-[#0a0a0a]">No shipping options available</p>
								<p class="text-sm text-[#737373]">
									Delivery methods are being updated. Please check back shortly or contact support
									for help with your order.
								</p>
							</div>
						{:else}
							<div class="hidden md:block">
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Method</Table.Head>
											<Table.Head>Delivery time</Table.Head>
											<Table.Head class="text-right">Cost</Table.Head>
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
													{option.minDays}–{option.maxDays} days
												</Table.Cell>
												<Table.Cell class="py-3 text-right">
													{#if option.price === 0}
														<Badge variant="secondary">Free</Badge>
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
												<Badge variant="secondary">Free</Badge>
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
											<span class="text-[#737373]">Delivery time</span>
											<span class="font-medium text-[#0a0a0a]">
												{option.minDays}–{option.maxDays} days
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
						Shipping FAQ
					</h2>
					<p class="text-sm text-[#737373]">
						Answers to the questions our support team hears most often.
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
								Need more help?
							</h2>
							<p class="text-sm text-[#737373]">
								Browse the rest of our help centre or contact our support team for order-specific
								questions.
							</p>
						</div>
						<div class="flex flex-col gap-3 sm:flex-row">
							<Button href="/help" variant="outline">Back to help</Button>
							<Button href="/account/support-tickets">Contact support</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</section>
		</div>
	</main>
	<SiteFooter />
</div>
