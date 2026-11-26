<script lang="ts">
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

	const sections = [
		{ id: 'information-we-collect', title: 'Information we collect' },
		{ id: 'how-we-use', title: 'How we use information' },
		{ id: 'sharing', title: 'Sharing and service providers' },
		{ id: 'cookies', title: 'Cookies and tracking' },
		{ id: 'security', title: 'Data security' },
		{ id: 'your-rights', title: 'Your rights' },
		{ id: 'children', title: "Children's privacy" },
		{ id: 'changes', title: 'Changes to this policy' },
		{ id: 'contact', title: 'Contact us' }
	];

	onMount(() => {
		void site.ensure();
	});
</script>

<div class="flex min-h-screen w-full flex-col bg-white">
	<SiteHeader />
	<main class="flex-1">
		<div class="mx-auto w-full max-w-[1280px] px-4 pt-6 sm:px-8">
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Page>Privacy policy</Breadcrumb.Page>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</div>

		<div class="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-8">
			<div class="flex flex-col items-start gap-3">
				<Badge variant="secondary">Legal</Badge>
				<h1
					class="text-3xl font-bold tracking-tight text-foreground max-[480px]:text-2xl max-[480px]:leading-8 sm:text-4xl"
				>
					Privacy policy
				</h1>
				<p class="max-w-2xl text-sm leading-relaxed text-muted-foreground">
					How Shopix collects, uses and protects your personal information.
				</p>
				<p class="text-xs text-muted-foreground">Last updated: November 7, 2026</p>
			</div>
		</div>

		<div class="mx-auto w-full max-w-[1280px] px-4 py-10 sm:px-8">
			<div class="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
				<aside class="lg:sticky lg:top-24 lg:self-start">
					<Card.Root>
						<Card.Header>
							<Card.Title>On this page</Card.Title>
						</Card.Header>
						<Card.Content class="px-2 pb-3">
							<ScrollArea.Root class="max-h-[calc(100vh-12rem)]">
								<nav aria-label="Table of contents" class="flex flex-col gap-0.5 px-2">
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
						<h2 class="text-xl font-semibold text-foreground">Information we collect</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							We collect information you provide directly, information generated when you shop with
							us, and limited technical data from the devices you use. The exact data depends on how
							you interact with Shopix.
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground">Account details.</span> Your name, email address,
								phone number, saved addresses and login credentials.
							</li>
							<li>
								<span class="font-medium text-foreground">Order information.</span> Products purchased,
								delivery and billing addresses, order history, returns and refund records.
							</li>
							<li>
								<span class="font-medium text-foreground">Payment metadata.</span> Card brand, last four
								digits, expiry and billing address. Full card numbers are handled by our payment processors
								and are never stored on our servers.
							</li>
							<li>
								<span class="font-medium text-foreground">Device and usage data.</span> IP address, browser
								type, operating system, referring pages, and the pages and products you view.
							</li>
							<li>
								<span class="font-medium text-foreground">Communications.</span> Messages you send to
								support, product reviews, survey responses and marketing preferences.
							</li>
						</ul>
					</section>

					<section id="how-we-use" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">How we use information</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							We use personal information to operate Shopix and to make your shopping experience
							reliable, secure and relevant. Specifically, we use it to:
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground">Fulfil orders.</span> Process payments, arrange
								delivery, handle returns and provide order updates.
							</li>
							<li>
								<span class="font-medium text-foreground">Provide support.</span> Respond to questions,
								resolve disputes and troubleshoot account issues.
							</li>
							<li>
								<span class="font-medium text-foreground">Prevent fraud and abuse.</span> Detect suspicious
								activity, verify transactions and protect customers and Shopix.
							</li>
							<li>
								<span class="font-medium text-foreground">Personalize your experience.</span> Recommend
								products, remember preferences and tailor offers, subject to your choices.
							</li>
							<li>
								<span class="font-medium text-foreground">Meet legal obligations.</span> Comply with tax,
								accounting, consumer protection and other applicable laws.
							</li>
						</ul>
					</section>

					<section id="sharing" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">Sharing and service providers</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							We share personal information only with service providers that help us run the store,
							and only to the extent needed for their work. We do not sell your personal
							information.
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground">Payment processors</span> that authorize and
								settle transactions.
							</li>
							<li>
								<span class="font-medium text-foreground">Shipping carriers</span> that deliver orders
								and provide tracking updates.
							</li>
							<li>
								<span class="font-medium text-foreground">Hosting and analytics providers</span> that
								keep the site available and help us understand how it is used.
							</li>
							<li>
								<span class="font-medium text-foreground">Legal and regulatory requests</span> where we
								are required to disclose information or must protect our rights and users.
							</li>
						</ul>
						<Card.Root class="bg-muted/50">
							<Card.Content class="py-4">
								<p class="text-sm leading-relaxed text-muted-foreground">
									<span class="font-medium text-foreground">We never sell your personal data.</span>
									We may share aggregated, de-identified insights, but never information that identifies
									you.
								</p>
							</Card.Content>
						</Card.Root>
					</section>

					<section id="cookies" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">Cookies and tracking</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							Cookies and similar technologies help us keep you signed in, remember your cart and
							understand how the store performs. We use three broad categories:
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground">Essential cookies</span> needed for checkout,
								security and core site functions. These cannot be switched off.
							</li>
							<li>
								<span class="font-medium text-foreground">Analytics cookies</span> that show us which
								pages are visited and how customers move through the store, so we can improve it.
							</li>
							<li>
								<span class="font-medium text-foreground">Preference cookies</span> that remember choices
								such as currency, language and recently viewed items.
							</li>
						</ul>
						<p class="text-sm leading-relaxed text-muted-foreground">
							You can manage or delete cookies through your browser settings. Blocking essential
							cookies may prevent checkout and account features from working correctly.
						</p>
					</section>

					<section id="security" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">Data security</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							We protect personal information with encryption in transit, access controls and
							monitoring designed to prevent unauthorized access, loss or misuse.
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							Only team members and service providers who need information to perform their work can
							access it, and we review permissions regularly. We retain personal data only for as
							long as needed to provide our services, meet legal obligations, resolve disputes and
							enforce agreements.
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							No method of transmission or storage is completely secure. If you believe your account
							has been compromised, contact us right away.
						</p>
					</section>

					<section id="your-rights" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">Your rights</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							Depending on where you live, you may have the right to access, correct, delete or port
							your personal information, and to object to or restrict certain processing.
						</p>
						<ul class="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
							<li>
								<span class="font-medium text-foreground">Access</span> a copy of the personal information
								we hold about you.
							</li>
							<li>
								<span class="font-medium text-foreground">Correction</span> of inaccurate or incomplete
								details.
							</li>
							<li>
								<span class="font-medium text-foreground">Deletion</span> of information we no longer
								need for a lawful purpose.
							</li>
							<li>
								<span class="font-medium text-foreground">Portability</span> of data you provided, in
								a structured, commonly used format.
							</li>
							<li>
								<span class="font-medium text-foreground">Objection</span> to processing based on legitimate
								interests, including some marketing.
							</li>
						</ul>
						<p class="text-sm leading-relaxed text-muted-foreground">
							To exercise a right, email us at
							<a
								href={`mailto:${site.contact.email}`}
								class="font-medium text-foreground underline underline-offset-4"
							>
								{site.contact.email}
							</a>. We may ask you to verify your identity, and we will respond within the timeframe
							required by applicable law.
						</p>
					</section>

					<section id="children" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">Children's privacy</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							Shopix is not intended for children under 13, or under 16 in regions where a higher
							age applies. We do not knowingly collect personal information from children below
							these ages.
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							If you believe a child has provided us with personal information, please contact us
							and we will take steps to delete it.
						</p>
					</section>

					<section id="changes" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">Changes to this policy</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							We may update this policy to reflect changes in our practices, technology or legal
							requirements. When we do, we will post the revised version on this page and update the
							"Last updated" date above.
						</p>
						<p class="text-sm leading-relaxed text-muted-foreground">
							If a change materially affects how we use your personal information, we will provide a
							clearer notice, such as an email or a banner on the site, before it takes effect.
						</p>
					</section>

					<section id="contact" class="scroll-mt-24 space-y-4">
						<h2 class="text-xl font-semibold text-foreground">Contact us</h2>
						<p class="text-sm leading-relaxed text-muted-foreground">
							If you have questions about this policy or how your information is handled, our team
							is happy to help.
						</p>
						<Card.Root>
							<Card.Content class="flex flex-col gap-4 py-4">
								<div class="flex flex-col gap-1 text-sm">
									<span class="font-medium text-foreground">Shopix Privacy Team</span>
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
									<Button href="/account/support-tickets">Contact support</Button>
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
