<script lang="ts">
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
			title: 'Shipping & delivery',
			description: 'Delivery windows, shipping costs and carrier options for every order.',
			href: '/help/shipping',
			icon: Truck
		},
		{
			title: 'Purchase protection',
			description: 'How Shopix keeps your payments and purchases safe from checkout to delivery.',
			href: '/help/purchase-protection',
			icon: ShieldCheck
		},
		{
			title: 'Returns & refunds',
			description: 'Start a return, check eligibility and follow the status of your refund.',
			href: '/account/returns-refunds',
			icon: RotateCcw
		},
		{
			title: 'Track your order',
			description: 'Follow your package in real time and view delivery updates.',
			href: '/account/order-tracking',
			icon: MapPin
		},
		{
			title: 'Payment & billing',
			description: 'Manage payment methods, billing details and order invoices.',
			href: '/account/payment',
			icon: CreditCard
		},
		{
			title: 'Contact support',
			description: 'Open a support ticket and chat with our customer care team.',
			href: '/account/support-tickets',
			icon: LifeBuoy
		}
	];

	const faqs = [
		{
			id: 'shipping-cost',
			question: 'How much does shipping cost?',
			answer:
				'Standard shipping is free on orders over $50. Below that, a flat rate is calculated at checkout based on your destination.'
		},
		{
			id: 'delivery-time',
			question: 'How long does delivery take?',
			answer:
				'Standard orders arrive in 3–5 business days. Express delivery is available at checkout for 1–2 business day arrival.'
		},
		{
			id: 'tracking',
			question: 'Can I track my order?',
			answer:
				'Yes. Once your order ships you will receive a tracking link by email, and you can follow its progress anytime on the order tracking page.'
		},
		{
			id: 'returns',
			question: 'What is your return policy?',
			answer:
				'You can return most items within 30 days of delivery for a refund. Items must be unused and in their original packaging.'
		},
		{
			id: 'refunds',
			question: 'How long do refunds take?',
			answer:
				'Refunds are issued to your original payment method within 5–7 business days after we receive and inspect your return.'
		},
		{
			id: 'support-response',
			question: 'How fast does support respond?',
			answer:
				'We reply to most requests within one business day, Monday through Friday. Express delivery orders and damaged items are prioritised.'
		},
		{
			id: 'secure-checkout',
			question: 'Is checkout secure?',
			answer:
				'Yes. Payments are processed over an encrypted connection by PCI-compliant providers, and we never store your full card details.'
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

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />
	<main class="flex-1">
		<section class="mx-auto max-w-[1280px] px-4 py-12 text-center sm:px-8 sm:py-16">
			<div class="mx-auto flex max-w-2xl flex-col items-center gap-4">
				<Badge variant="secondary">Support</Badge>
				<h1 class="font-['Geist:Bold'] text-3xl leading-tight text-[#0a0a0a] sm:text-4xl">
					How can we help?
				</h1>
				<p class="font-['Geist:Regular'] text-base text-[#737373] sm:text-lg">
					Find answers about orders, shipping, returns and your account.
				</p>
				<div class="relative mt-2 w-full max-w-xl">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#737373]"
						aria-hidden="true"
					/>
					<Input
						bind:value={query}
						type="search"
						placeholder="Search help topics..."
						aria-label="Search help topics"
						class="h-11 pl-9"
					/>
				</div>
			</div>
		</section>

		<section
			class="mx-auto max-w-[1280px] px-4 pb-12 sm:px-8 sm:pb-16"
			aria-labelledby="topics-heading"
		>
			<h2 id="topics-heading" class="mb-6 font-['Geist:Bold'] text-2xl text-[#0a0a0a]">
				Browse topics
			</h2>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredTopics as topic (topic.href)}
					{@const Icon = topic.icon}
					<Card.Root class="h-full">
						<Card.Header>
							<div class="mb-2 flex size-10 items-center justify-center rounded-full bg-[#f5f5f5]">
								<Icon class="size-5 text-[#0a0a0a]" aria-hidden="true" />
							</div>
							<Card.Title
								role="heading"
								aria-level={3}
								class="font-['Geist:SemiBold'] text-lg text-[#0a0a0a]"
							>
								{topic.title}
							</Card.Title>
							<Card.Description class="font-['Geist:Regular'] text-[#737373]">
								{topic.description}
							</Card.Description>
						</Card.Header>
						<Card.Footer class="mt-auto justify-start bg-transparent">
							<Button variant="link" href={topic.href} class="px-0">Learn more</Button>
						</Card.Footer>
					</Card.Root>
				{/each}
				{#if filteredTopics.length === 0}
					<Card.Root class="bg-[#f5f5f5] sm:col-span-2 lg:col-span-3">
						<Card.Content class="py-10 text-center">
							<p class="font-['Geist:Regular'] text-sm text-[#737373]">No matching topics</p>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</section>

		<section class="border-t border-[#e5e5e5]" aria-labelledby="faq-heading">
			<div class="mx-auto max-w-[1280px] px-4 py-12 sm:px-8 sm:py-16">
				<div class="mx-auto max-w-3xl">
					<h2 id="faq-heading" class="font-['Geist:Bold'] text-2xl text-[#0a0a0a]">
						Frequently asked questions
					</h2>
					<div class="mt-6 flex flex-col gap-3">
						{#each filteredFaqs as faq (faq.id)}
							<Collapsible.Root class="rounded-xl border border-[#e5e5e5] bg-white">
								<Collapsible.Trigger
									class="group flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-['Geist:Medium'] text-sm text-[#0a0a0a] sm:text-base"
								>
									<span>{faq.question}</span>
									<ChevronDown
										class="size-4 shrink-0 text-[#737373] transition-transform group-data-[state=open]:rotate-180"
										aria-hidden="true"
									/>
								</Collapsible.Trigger>
								<Collapsible.Content>
									<p class="px-4 pb-4 font-['Geist:Regular'] text-sm text-[#737373]">
										{faq.answer}
									</p>
								</Collapsible.Content>
							</Collapsible.Root>
						{/each}
						{#if filteredFaqs.length === 0}
							<Card.Root class="bg-[#f5f5f5]">
								<Card.Content class="py-8 text-center">
									<p class="font-['Geist:Regular'] text-sm text-[#737373]">No matching questions</p>
								</Card.Content>
							</Card.Root>
						{/if}
					</div>
				</div>
			</div>
		</section>

		<section class="mx-auto max-w-[1280px] px-4 pb-16 sm:px-8 sm:pb-20">
			<Card.Root class="bg-[#f5f5f5]">
				<Card.Content class="flex flex-col items-center gap-4 py-10 text-center sm:py-12">
					<LifeBuoy class="size-8 text-[#0a0a0a]" aria-hidden="true" />
					<h2 class="font-['Geist:Bold'] text-2xl text-[#0a0a0a]">Still need help?</h2>
					<p class="max-w-xl font-['Geist:Regular'] text-sm text-[#737373] sm:text-base">
						Our support team is ready to help with orders, delivery and account questions.
					</p>
					<div class="flex flex-wrap items-center justify-center gap-3">
						<Button href="/account/support-tickets">Contact support</Button>
						<Button variant="outline" href="/account/order-tracking">Track an order</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</section>
	</main>
	<SiteFooter />
</div>
