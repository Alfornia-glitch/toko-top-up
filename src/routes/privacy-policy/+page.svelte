<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import * as Breadcrumb from '#lib/frontend/components/ui/breadcrumb/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as ScrollArea from '#lib/frontend/components/ui/scroll-area/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { formatDate } from '#lib/frontend/modules/commerce/format.ts';

	const LAST_UPDATED = new Date(2026, 10, 7);

	const sections = [
		{ id: 'information-we-collect', title: m.storefront_privacy_section_collect() },
		{ id: 'how-we-use', title: m.storefront_privacy_section_use() },
		{ id: 'sharing', title: m.storefront_privacy_section_sharing() },
		{ id: 'cookies', title: m.storefront_privacy_section_cookies() },
		{ id: 'security', title: m.storefront_privacy_section_security() },
		{ id: 'your-rights', title: m.storefront_privacy_section_rights() },
		{ id: 'children', title: m.storefront_privacy_section_children() },
		{ id: 'changes', title: m.storefront_privacy_section_changes() },
		{ id: 'contact', title: m.storefront_privacy_section_contact() }
	];

	onMount(() => {
		void site.ensure();
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-background">
	<SiteHeader />
	<main class="flex-1">
		<div class="mx-auto w-full max-w-[1280px] px-4 pt-6 sm:px-8">
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">{m.common_home()}</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>{m.storefront_privacy_breadcrumb()}</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>

		<div class="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-8">
			<div class="flex flex-col items-start gap-3">
				<Badge variant="secondary">{m.storefront_privacy_badge()}</Badge>
				<h1
					class="text-3xl font-bold tracking-tight text-foreground max-[480px]:text-2xl max-[480px]:leading-8 sm:text-4xl"
				>
					{m.storefront_privacy_breadcrumb()}
				</h1>
				<p class="max-w-2xl text-sm leading-relaxed text-muted-foreground">
					{m.storefront_privacy_intro({ store: site.storeName })}
				</p>
				<p class="text-xs text-muted-foreground">
					{m.storefront_privacy_updated({ date: formatDate(LAST_UPDATED) })}
				</p>
			</div>
		</div>

		<div class="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-8">
			<div class="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
				<aside class="lg:sticky lg:top-24 lg:self-start">
					<Card.Root>
						<Card.Header>
							<Card.Title>{m.storefront_privacy_toc_title()}</Card.Title>
						</Card.Header>
						<Card.Content class="px-2 pb-3">
							<ScrollArea.Root class="max-h-[calc(100vh-12rem)]">
								<nav
									aria-label={m.storefront_privacy_toc_label()}
									class="flex flex-col gap-0.5 px-2"
								>
									{#each sections as section (section.id)}
										<a
											href={`#${section.id}`}
											class="rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										>
											{section.title}
										</a>
									{/each}
								</nav>
							</ScrollArea.Root>
						</Card.Content>
					</Card.Root>
				</aside>

				<div class="space-y-10">
					<section id="information-we-collect" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_collect()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_collect_intro({ store: site.storeName })}
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_collect_account_lead()}</span
								>
								{m.storefront_privacy_collect_account_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_collect_order_lead()}</span
								>
								{m.storefront_privacy_collect_order_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_collect_payment_lead()}</span
								>
								{m.storefront_privacy_collect_payment_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_collect_device_lead()}</span
								>
								{m.storefront_privacy_collect_device_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_collect_comms_lead()}</span
								>
								{m.storefront_privacy_collect_comms_text()}
							</li>
						</ul>
					</section>

					<section id="how-we-use" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_use()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_use_intro({ store: site.storeName })}
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_use_fulfil_lead()}</span
								>
								{m.storefront_privacy_use_fulfil_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_use_support_lead()}</span
								>
								{m.storefront_privacy_use_support_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_use_fraud_lead()}</span
								>
								{m.storefront_privacy_use_fraud_text({ store: site.storeName })}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_use_personalize_lead()}</span
								>
								{m.storefront_privacy_use_personalize_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_use_legal_lead()}</span
								>
								{m.storefront_privacy_use_legal_text()}
							</li>
						</ul>
					</section>

					<section id="sharing" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_sharing()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_sharing_intro()}
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_sharing_payment_lead()}</span
								>
								{m.storefront_privacy_sharing_payment_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_sharing_carriers_lead()}</span
								>
								{m.storefront_privacy_sharing_carriers_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_sharing_hosting_lead()}</span
								>
								{m.storefront_privacy_sharing_hosting_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_sharing_legal_lead()}</span
								>
								{m.storefront_privacy_sharing_legal_text()}
							</li>
						</ul>
						<Card.Root class="bg-muted/50">
							<Card.Content class="py-4">
								<p class="text-sm leading-relaxed text-muted-foreground">
									<span class="font-medium text-foreground"
										>{m.storefront_privacy_never_sell_lead()}</span
									>
									{m.storefront_privacy_never_sell_text()}
								</p>
							</Card.Content>
						</Card.Root>
					</section>

					<section id="cookies" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_cookies()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_cookies_intro()}
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_cookies_essential_lead()}</span
								>
								{m.storefront_privacy_cookies_essential_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_cookies_analytics_lead()}</span
								>
								{m.storefront_privacy_cookies_analytics_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_cookies_preference_lead()}</span
								>
								{m.storefront_privacy_cookies_preference_text()}
							</li>
						</ul>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_cookies_manage()}
						</p>
					</section>

					<section id="security" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_security()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_security_1()}
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_security_2()}
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_security_3()}
						</p>
					</section>

					<section id="your-rights" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_rights()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_rights_intro()}
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_rights_access_lead()}</span
								>
								{m.storefront_privacy_rights_access_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_rights_correction_lead()}</span
								>
								{m.storefront_privacy_rights_correction_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_rights_deletion_lead()}</span
								>
								{m.storefront_privacy_rights_deletion_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_rights_portability_lead()}</span
								>
								{m.storefront_privacy_rights_portability_text()}
							</li>
							<li>
								<span class="font-medium text-foreground"
									>{m.storefront_privacy_rights_objection_lead()}</span
								>
								{m.storefront_privacy_rights_objection_text()}
							</li>
						</ul>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_rights_exercise()}
							<a
								href={`mailto:${site.contact.email}`}
								class="font-medium text-foreground underline underline-offset-4"
							>
								{site.contact.email}
							</a>. {m.storefront_privacy_rights_verify()}
						</p>
					</section>

					<section id="children" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_children()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_children_1({ store: site.storeName })}
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_children_2()}
						</p>
					</section>

					<section id="changes" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_changes()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_changes_1()}
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_changes_2()}
						</p>
					</section>

					<section id="contact" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">
							{m.storefront_privacy_section_contact()}
						</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{m.storefront_privacy_contact_intro()}
						</p>
						<Card.Root>
							<Card.Content class="flex flex-col gap-4 py-4">
								<div class="flex flex-col gap-1 text-sm">
									<span class="font-medium text-foreground"
										>{m.storefront_privacy_contact_team({ store: site.storeName })}</span
									>
									{#if site.contact.email}
										<a
											href={`mailto:${site.contact.email}`}
											class="text-muted-foreground hover:text-foreground hover:underline"
										>
											{site.contact.email}
										</a>
									{/if}
									{#if site.contact.phone}
										<a
											href={`tel:${site.contact.phone.replace(/[^+\d]/g, '')}`}
											class="text-muted-foreground hover:text-foreground hover:underline"
										>
											{site.contact.phone}
										</a>
									{/if}
									{#if site.contact.address1 || site.contact.address2}
										<p class="text-muted-foreground">
											{#if site.contact.address1}{site.contact.address1}{/if}
											{#if site.contact.address1 && site.contact.address2}<br />{/if}
											{#if site.contact.address2}{site.contact.address2}{/if}
										</p>
									{/if}
								</div>
								<Separator />
								<div>
									<Button href="/account/support-tickets"
										>{m.storefront_pp_contact_support()}</Button
									>
								</div>
							</Card.Content>
						</Card.Root>
					</section>
				</div>
			</div>
		</div>
	</main>
	<SiteFooter />
</div>
