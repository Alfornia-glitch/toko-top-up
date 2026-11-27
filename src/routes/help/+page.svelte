<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import {
		ChevronDown,
		CreditCard,
		LifeBuoy,
		MapPin,
		RotateCcw,
		Search,
		ShieldCheck,
		Truck
	} from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Collapsible from '#lib/frontend/components/ui/collapsible/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';

	let query = $state('');

	const topics = [
		{
			title: m.storefront_help_topic_shipping_title(),
			description: m.storefront_help_topic_shipping_desc(),
			href: '/help/shipping',
			icon: Truck
		},
		{
			title: m.storefront_help_topic_protection_title(),
			description: m.storefront_help_topic_protection_desc({ store: site.storeName }),
			href: '/help/purchase-protection',
			icon: ShieldCheck
		},
		{
			title: m.storefront_help_topic_returns_title(),
			description: m.storefront_help_topic_returns_desc(),
			href: '/account/returns-refunds',
			icon: RotateCcw
		},
		{
			title: m.storefront_help_topic_tracking_title(),
			description: m.storefront_help_topic_tracking_desc(),
			href: '/account/order-tracking',
			icon: MapPin
		},
		{
			title: m.storefront_help_topic_billing_title(),
			description: m.storefront_help_topic_billing_desc(),
			href: '/account/payment',
			icon: CreditCard
		},
		{
			title: m.storefront_help_topic_contact_title(),
			description: m.storefront_help_topic_contact_desc(),
			href: '/account/support-tickets',
			icon: LifeBuoy
		}
	];

	const faqs = [
		{
			id: 'shipping-cost',
			question: m.storefront_help_faq_shipping_cost_q(),
			answer: m.storefront_help_faq_shipping_cost_a()
		},
		{
			id: 'delivery-time',
			question: m.storefront_help_faq_delivery_time_q(),
			answer: m.storefront_help_faq_delivery_time_a()
		},
		{
			id: 'tracking',
			question: m.storefront_help_faq_tracking_q(),
			answer: m.storefront_help_faq_tracking_a()
		},
		{
			id: 'returns',
			question: m.storefront_help_faq_returns_q(),
			answer: m.storefront_help_faq_returns_a()
		},
		{
			id: 'refunds',
			question: m.storefront_help_faq_refunds_q(),
			answer: m.storefront_help_faq_refunds_a()
		},
		{
			id: 'support-response',
			question: m.storefront_help_faq_support_q(),
			answer: m.storefront_help_faq_support_a()
		},
		{
			id: 'secure-checkout',
			question: m.storefront_help_faq_secure_q(),
			answer: m.storefront_help_faq_secure_a()
		}
	];

	function matchesSearch(...values: string[]) {
		const needle = query.trim().toLowerCase();
		if (!needle) return true;
		return values.some((value) => value.toLowerCase().includes(needle));
	}

	const filteredTopics = $derived(
		topics.filter((topic) => matchesSearch(topic.title, topic.description))
	);

	const filteredFaqs = $derived(faqs.filter((faq) => matchesSearch(faq.question, faq.answer)));
</script>

<div class="flex min-h-screen w-full flex-col bg-background">
	<SiteHeader />
	<main class="flex-1">
		<section class="mx-auto max-w-[1280px] px-4 py-12 text-center sm:px-8 sm:py-16">
			<div class="mx-auto flex max-w-2xl flex-col items-center gap-4">
				<Badge variant="secondary">{m.storefront_help_badge()}</Badge>
				<h1
					class="font-['Geist:Bold'] text-3xl leading-tight text-foreground max-[480px]:text-2xl max-[480px]:leading-8 sm:text-4xl"
				>
					{m.storefront_help_title()}
				</h1>
				<p class="font-['Geist:Regular'] text-base text-muted-foreground sm:text-lg">
					{m.storefront_help_subtitle()}
				</p>
				<div class="relative mt-2 w-full max-w-xl">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<Input
						bind:value={query}
						type="search"
						placeholder={m.storefront_help_search()}
						aria-label={m.storefront_help_search_label()}
						class="h-11 pl-9"
					/>
				</div>
			</div>
		</section>

		<section
			class="mx-auto max-w-[1280px] px-4 pb-12 sm:px-8 sm:pb-16"
			aria-labelledby="topics-heading"
		>
			<h2 id="topics-heading" class="mb-6 font-['Geist:Bold'] text-2xl text-foreground">
				{m.storefront_help_browse_topics()}
			</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredTopics as topic (topic.href)}
					{@const Icon = topic.icon}
					<Card.Root class="h-full">
						<Card.Header>
							<div class="mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
								<Icon class="size-5 text-foreground" aria-hidden="true" />
							</div>
							<Card.Title
								role="heading"
								aria-level={3}
								class="font-['Geist:SemiBold'] text-lg text-foreground"
							>
								{topic.title}
							</Card.Title>
							<Card.Description class="font-['Geist:Regular'] text-muted-foreground">
								{topic.description}
							</Card.Description>
						</Card.Header>
						<Card.Footer class="mt-auto justify-start bg-transparent">
							<Button variant="link" href={topic.href} class="px-0"
								>{m.storefront_help_learn_more()}</Button
							>
						</Card.Footer>
					</Card.Root>
				{/each}
				{#if filteredTopics.length === 0}
					<Card.Root class="bg-muted sm:col-span-2 lg:col-span-3">
						<Card.Content class="py-10 text-center">
							<p class="font-['Geist:Regular'] text-sm text-muted-foreground">
								{m.storefront_help_no_topics()}
							</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</section>

		<section class="border-t border-border" aria-labelledby="faq-heading">
			<div class="mx-auto max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
				<div class="mx-auto max-w-3xl">
					<h2 id="faq-heading" class="font-['Geist:Bold'] text-2xl text-foreground">
						{m.storefront_help_faq_title()}
					</h2>
					<div class="mt-6 flex flex-col gap-3">
						{#each filteredFaqs as faq (faq.id)}
							<Collapsible.Root class="rounded-xl border border-border bg-card">
								<Collapsible.Trigger
									class="group flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-['Geist:Medium'] text-sm text-foreground sm:text-base"
								>
									<span>{faq.question}</span>
									<ChevronDown
										class="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
										aria-hidden="true"
									/>
								</Collapsible.Trigger>
								<Collapsible.Content>
									<p class="px-4 pb-4 font-['Geist:Regular'] text-sm text-muted-foreground">
										{faq.answer}
									</p>
								</Collapsible.Content>
							</Collapsible.Root>
						{/each}
						{#if filteredFaqs.length === 0}
							<Card.Root class="bg-muted">
								<Card.Content class="py-8 text-center">
									<p class="font-['Geist:Regular'] text-sm text-muted-foreground">
										{m.storefront_help_no_faqs()}
									</p>
								</Card.Content>
							</Card.Root>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<section class="mx-auto max-w-[1280px] px-4 pb-16 sm:px-8 sm:pb-20">
			<Card.Root class="bg-muted">
				<Card.Content class="flex flex-col items-center gap-4 py-10 text-center sm:py-12">
					<LifeBuoy class="size-8 text-foreground" aria-hidden="true" />
					<h2 class="font-['Geist:Bold'] text-2xl text-foreground">
						{m.storefront_help_still_need()}
					</h2>
					<p class="max-w-xl font-['Geist:Regular'] text-sm text-muted-foreground sm:text-base">
						{m.storefront_help_still_need_desc()}
					</p>
					<div class="flex flex-wrap items-center justify-center gap-3">
						<Button href="/account/support-tickets">{m.storefront_help_contact_support()}</Button>
						<Button variant="outline" href="/account/order-tracking"
							>{m.storefront_help_track_order()}</Button
						>
					</div>
				</Card.Content>
			</Card.Root>
		</section>
	</main>
	<SiteFooter />
</div>
