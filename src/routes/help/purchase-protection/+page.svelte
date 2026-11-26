<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
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
			title: m.storefront_pp_benefit_secure_title(),
			description: m.storefront_pp_benefit_secure_desc()
		},
		{
			icon: Truck,
			title: m.storefront_pp_benefit_delivery_title(),
			description: m.storefront_pp_benefit_delivery_desc()
		},
		{
			icon: PackageCheck,
			title: m.storefront_pp_benefit_described_title(),
			description: m.storefront_pp_benefit_described_desc()
		},
		{
			icon: ShieldCheck,
			title: m.storefront_pp_benefit_damage_title(),
			description: m.storefront_pp_benefit_damage_desc()
		},
		{
			icon: RotateCcw,
			title: m.storefront_pp_benefit_returns_title(),
			description: m.storefront_pp_benefit_returns_desc()
		},
		{
			icon: LifeBuoy,
			title: m.storefront_pp_benefit_support_title(),
			description: m.storefront_pp_benefit_support_desc()
		}
	];

	const covered = [
		m.storefront_pp_covered_1(),
		m.storefront_pp_covered_2(),
		m.storefront_pp_covered_3(),
		m.storefront_pp_covered_4(),
		m.storefront_pp_covered_5()
	];

	const notCovered = [
		m.storefront_pp_not_covered_1(),
		m.storefront_pp_not_covered_2(),
		m.storefront_pp_not_covered_3(),
		m.storefront_pp_not_covered_4(),
		m.storefront_pp_not_covered_5()
	];

	const steps = [
		{
			title: m.storefront_pp_step_1_title(),
			description: m.storefront_pp_step_1_desc()
		},
		{
			title: m.storefront_pp_step_2_title(),
			description: m.storefront_pp_step_2_desc()
		},
		{
			title: m.storefront_pp_step_3_title(),
			description: m.storefront_pp_step_3_desc()
		},
		{
			title: m.storefront_pp_step_4_title(),
			description: m.storefront_pp_step_4_desc()
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
						<Breadcrumb.Link href="/">{m.common_home()}</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/help">{m.storefront_pp_breadcrumb_help()}</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{m.storefront_pp_title()}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>

			<section
				class="flex flex-col items-start gap-5 rounded-[14px] border bg-[#f5f5f5] p-6 sm:p-10"
			>
				<Badge variant="secondary">{m.storefront_pp_badge()}</Badge>
				<h1
					class="font-['Geist:Bold'] text-3xl leading-tight text-[#0a0a0a] max-[480px]:text-2xl max-[480px]:leading-8 sm:text-4xl"
				>
					{m.storefront_pp_title()}
				</h1>
				<p class="max-w-2xl text-base text-muted-foreground sm:text-lg">
					{m.storefront_pp_intro()}
				</p>
				<div class="flex flex-wrap items-center gap-3">
					<Button href="/products">{m.storefront_pp_start_shopping()}</Button>
					<Button variant="outline" href="/account/support-tickets"
						>{m.storefront_pp_file_claim()}</Button
					>
				</div>
			</section>

			<section class="flex flex-col gap-6">
				<h2 class="font-['Geist:Bold'] text-2xl leading-tight text-[#0a0a0a] sm:text-3xl">
					{m.storefront_pp_includes_title()}
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
					{m.storefront_pp_coverage_title()}
				</h2>
				<div class="grid gap-6 md:grid-cols-2">
					<Card.Root class="h-full">
						<Card.Header>
							<h3 class="flex items-center gap-2 text-lg font-semibold text-[#0a0a0a]">
								<Check class="size-5 text-[#16a34a]" aria-hidden="true" />
								{m.storefront_pp_covered_title()}
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
								{m.storefront_pp_not_covered_title()}
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
					{m.storefront_pp_how_title()}
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
						{m.storefront_pp_cta_title()}
					</h2>
					<p class="max-w-xl text-sm text-muted-foreground sm:text-base">
						{m.storefront_pp_cta_desc()}
					</p>
					<div class="flex flex-wrap items-center justify-center gap-3">
						<Button href="/account/support-tickets">{m.storefront_pp_contact_support()}</Button>
						<Button variant="outline" href="/account/orders">{m.storefront_pp_view_orders()}</Button
						>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</main>
	<SiteFooter />
</div>
