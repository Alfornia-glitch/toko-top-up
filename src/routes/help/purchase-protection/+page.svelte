<script lang="ts">
	import {
		Check,
		LifeBuoy,
		Lock,
		PackageCheck,
		RotateCcw,
		ShieldCheck,
		Truck,
		X
	} from '@lucide/svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import * as Breadcrumb from '#lib/frontend/components/ui/breadcrumb/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';

	const benefits = [
		{
			icon: Lock,
			title: 'Secure payments',
			description:
				'Card details and payment tokens are encrypted end to end, with automated fraud monitoring on every checkout.'
		},
		{
			icon: Truck,
			title: 'Delivery guarantee',
			description:
				'If an eligible order never arrives, we refund the full amount or send a replacement at no extra cost.'
		},
		{
			icon: PackageCheck,
			title: 'Item not as described',
			description:
				'Covered when the item you receive differs materially from the listing description, photos, or specifications.'
		},
		{
			icon: ShieldCheck,
			title: 'Damage in transit',
			description:
				'Report damage within 48 hours of delivery with photos of the packaging and the item so we can make it right.'
		},
		{
			icon: RotateCcw,
			title: '30-day returns',
			description:
				'Unused items in their original condition can be returned within 30 days of delivery for a refund or credit.'
		},
		{
			icon: LifeBuoy,
			title: 'Dedicated support',
			description:
				'Real people review every claim and work with you until the case reaches a fair resolution.'
		}
	];

	const covered = [
		'An order arrives damaged, is lost, or never shows up',
		'The item materially differs from the listing',
		'The seller fails to ship within the promised window',
		'Unauthorized or fraudulent card charges',
		'Eligible unused items returned within 30 days'
	];

	const notCovered = [
		'Normal wear and tear from everyday use',
		'Misuse, accidents, or improper installation',
		'Unauthorized repairs or modifications',
		'Items reported outside the claim window',
		'Digital goods, gift cards, and downloadable content'
	];

	const steps = [
		{
			title: 'Open a support ticket',
			description: 'Start a claim from your account and select the order you need help with.'
		},
		{
			title: 'Include your order number and photos',
			description:
				'Attach the order number plus clear photos of the item, packaging, and any damage.'
		},
		{
			title: 'Support reviews within 2 business days',
			description:
				'A support specialist checks the evidence and keeps you updated on the next steps.'
		},
		{
			title: 'Choose your resolution',
			description:
				'Once approved, pick a refund, a replacement, or store credit — whichever works best for you.'
		}
	];
</script>

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />
	<main class="flex-1">
		<div
			class="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 py-8 sm:px-8 sm:py-12 lg:gap-16"
		>
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
						<Breadcrumb.Page>Purchase protection</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<section
				class="flex flex-col items-start gap-5 rounded-[14px] border bg-[#f5f5f5] p-6 sm:p-10"
			>
				<Badge variant="secondary">Buyer protection</Badge>
				<h1
					class="font-['Geist:Bold'] text-3xl leading-tight text-[#0a0a0a] max-[480px]:text-2xl max-[480px]:leading-8 sm:text-4xl"
				>
					Purchase protection
				</h1>
				<p class="max-w-2xl text-base text-muted-foreground sm:text-lg">
					Shop with confidence. Every eligible order is covered from checkout to delivery and
					beyond.
				</p>
				<div class="flex flex-wrap items-center gap-3">
					<Button href="/products">Start shopping</Button>
					<Button variant="outline" href="/account/support-tickets">File a claim</Button>
				</div>
			</section>

			<section class="flex flex-col gap-6">
				<h2 class="font-['Geist:Bold'] text-2xl leading-tight text-[#0a0a0a] sm:text-3xl">
					What your protection includes
				</h2>
				<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each benefits as benefit (benefit.title)}
						{@const Icon = benefit.icon}
						<Card.Root class="h-full">
							<Card.Header>
								<div
									class="flex size-11 items-center justify-center rounded-full bg-[#f5f5f5] text-[#0a0a0a]"
								>
									<Icon class="size-5" aria-hidden="true" />
								</div>
							</Card.Header>
							<Card.Content class="flex flex-col gap-2">
								<Card.Title class="text-base font-semibold">{benefit.title}</Card.Title>
								<Card.Description>{benefit.description}</Card.Description>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			</section>

			<section class="flex flex-col gap-6">
				<h2 class="font-['Geist:Bold'] text-2xl leading-tight text-[#0a0a0a] sm:text-3xl">
					Coverage details
				</h2>
				<div class="grid gap-6 md:grid-cols-2">
					<Card.Root class="h-full">
						<Card.Header>
							<h3 class="flex items-center gap-2 text-lg font-semibold text-[#0a0a0a]">
								<Check class="size-5 text-[#16a34a]" aria-hidden="true" />
								What's covered
							</h3>
						</Card.Header>
						<Card.Content>
							<ul class="flex flex-col gap-3">
								{#each covered as item (item)}
									<li class="flex items-start gap-3 text-sm text-muted-foreground">
										<Check class="mt-0.5 size-4 shrink-0 text-[#16a34a]" aria-hidden="true" />
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>

					<Card.Root class="h-full">
						<Card.Header>
							<h3 class="flex items-center gap-2 text-lg font-semibold text-[#0a0a0a]">
								<X class="size-5 text-[#dc2626]" aria-hidden="true" />
								What's not covered
							</h3>
						</Card.Header>
						<Card.Content>
							<ul class="flex flex-col gap-3">
								{#each notCovered as item (item)}
									<li class="flex items-start gap-3 text-sm text-muted-foreground">
										<X class="mt-0.5 size-4 shrink-0 text-[#dc2626]" aria-hidden="true" />
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</Card.Content>
					</Card.Root>
				</div>
			</section>

			<section class="flex flex-col gap-6">
				<h2 class="font-['Geist:Bold'] text-2xl leading-tight text-[#0a0a0a] sm:text-3xl">
					How to file a claim
				</h2>
				<ol class="grid list-none gap-4 md:grid-cols-2">
					{#each steps as step, index (step.title)}
						<li>
							<Card.Root class="h-full">
								<Card.Content class="flex items-start gap-4 py-2">
									<span
										class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-sm font-semibold text-white"
										aria-hidden="true"
									>
										{index + 1}
									</span>
									<div class="flex flex-col gap-1">
										<h3 class="text-base font-semibold text-[#0a0a0a]">{step.title}</h3>
										<p class="text-sm text-muted-foreground">{step.description}</p>
									</div>
								</Card.Content>
							</Card.Root>
						</li>
					{/each}
				</ol>
			</section>

			<Card.Root class="items-center gap-4 bg-[#f5f5f5] py-10 text-center ring-0">
				<Card.Content class="flex flex-col items-center gap-4">
					<h2 class="font-['Geist:Bold'] text-2xl leading-tight text-[#0a0a0a] sm:text-3xl">
						Need to file a claim?
					</h2>
					<p class="max-w-xl text-sm text-muted-foreground sm:text-base">
						Our support team can help you start a claim, track its progress, and find the right
						resolution for your order.
					</p>
					<div class="flex flex-wrap items-center justify-center gap-3">
						<Button href="/account/support-tickets">Contact support</Button>
						<Button variant="outline" href="/account/orders">View your orders</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</main>
	<SiteFooter />
</div>
