<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Label } from '#lib/frontend/components/ui/label/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { api, ApiError, unwrap } from '#frontend/modules/commerce/http.ts';
	import { formatDate } from '#frontend/modules/commerce/format.ts';
	import type { NewsletterSubscription } from '#frontend/modules/commerce/models.ts';

	type SubscriptionPayload = { data: NewsletterSubscription | null };
	type StatusPayload = { data: NewsletterSubscription };

	const imgHeroImage = '/assets/072c7.png';
	const imgRightIcon = '/assets/c6b74.svg';

	let subscription = $state<NewsletterSubscription | null>(null);
	let loading = $state(true);
	let loadError = $state('');
	let formError = $state('');
	let saving = $state(false);
	let email = $state('');

	function redirectToLogin(): void {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function failureMessage(cause: unknown): string {
		if (cause instanceof ApiError && cause.status === 401) {
			redirectToLogin();
			return '';
		}

		return cause instanceof Error ? cause.message : 'Something went wrong';
	}

	async function loadSubscription(): Promise<void> {
		loading = true;
		loadError = '';

		try {
			subscription = unwrap(await api.get<SubscriptionPayload>('/api/account/newsletter'));
		} catch (cause) {
			loadError = failureMessage(cause);
		} finally {
			loading = false;
		}
	}

	async function toggleStatus(): Promise<void> {
		if (!subscription) return;

		const nextStatus = subscription.status === 'subscribed' ? 'unsubscribed' : 'subscribed';
		saving = true;
		loadError = '';

		try {
			subscription = unwrap(
				await api.patch<StatusPayload>('/api/account/newsletter', { status: nextStatus })
			);
		} catch (cause) {
			loadError = failureMessage(cause);
		} finally {
			saving = false;
		}
	}

	async function subscribe(event: SubmitEvent): Promise<void> {
		event.preventDefault();
		formError = '';

		const value = email.trim();
		if (!value) {
			formError = 'Enter your email address.';
			return;
		}

		saving = true;

		try {
			await api.post<StatusPayload>('/api/newsletter', { email: value });
			email = '';
			await loadSubscription();
		} catch (cause) {
			formError = failureMessage(cause);
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void loadSubscription();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Email Newsletter"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white py-[56px]"
		data-name="Email Newsletter"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 content-stretch items-start gap-[24px] px-[32px]"
			data-name="Flex Horizontal"
		>
			<AccountSidebar />
			<div
				class="relative flex w-[893px] max-w-full shrink-0 flex-col content-stretch items-start gap-[14px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 content-stretch items-center gap-[10px] overflow-clip rounded-[6px] bg-[#f5f5f5] p-[24px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex w-[536px] max-w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						<div
							class="relative flex w-full max-w-[1280px] shrink-0 flex-col content-stretch items-start gap-[6px] [word-break:break-word]"
							data-name="block-heading"
						>
							<p
								class="relative w-[min-content] min-w-full shrink-0 font-['Geist:SemiBold'] text-[24px] leading-[32px] font-semibold text-[#0a0a0a]"
							>
								Join & Be First to Know About Exclusive Drops and Secret Deals
							</p>
							<p
								class="relative w-[min-content] min-w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal text-[#737373]"
							>
								Sign up today to get early access to new collections, secret sales, and curated
								picks you won’t find anywhere else.
							</p>
						</div>
						<a
							href="#newsletter-subscription"
							class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] bg-[#171717] px-[16px] py-[8px]"
							data-name="Button"
						>
							<div
								class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
							>
								<p class="leading-[20px]">Get Updates</p>
							</div>
							<div class="relative size-[16px] shrink-0" data-name="Right-icon">
								<img
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgRightIcon}
								/>
							</div>
						</a>
					</div>
					<div
						class="absolute top-[7.41px] left-[634.81px] hidden h-[258.525px] w-[243.56px] items-center justify-center lg:flex"
					>
						<div class="flex-none rotate-[10.52deg]">
							<div class="relative h-[224.693px] w-[206.003px]" data-name="Hero Image">
								<img
									alt=""
									class="pointer-events-none absolute inset-0 size-full max-w-none object-bottom"
									src={imgHeroImage}
								/>
							</div>
						</div>
					</div>
				</div>

				<div
					id="newsletter-subscription"
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
					data-name="Card"
				>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[14px] px-[24px]"
						data-name="card-body"
					>
						<p
							class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[24px] leading-[32px] font-semibold [word-break:break-word] text-[#0a0a0a]"
						>
							Email Newsletter
						</p>

						{#if loadError}
							<p class="w-full text-[14px] leading-[20px] text-[#dc2626]">{loadError}</p>
						{/if}

						{#if loading}
							<div class="flex w-full items-center justify-center py-[16px]">
								<Spinner class="size-6" aria-label="Loading newsletter subscription" />
							</div>
						{:else if subscription}
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px]"
								data-name="Flex Vertical"
							>
								<div
									class="relative flex w-full shrink-0 flex-wrap content-start items-center justify-between gap-[12px]"
									data-name="Flex Horizontal"
								>
									<p
										class="relative font-['Geist:Medium'] text-[16px] leading-[24px] font-medium [word-break:break-word] text-[#0a0a0a]"
									>
										{subscription.email}
									</p>
									<div
										class="relative flex shrink-0 content-stretch items-center justify-center gap-[2px] rounded-[9999px] border border-solid border-[#e5e5e5] px-[6px] py-[2px]"
										data-name="Outline Badge"
									>
										<p
											class="relative flex shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[16px] font-medium whitespace-nowrap text-[#0a0a0a] capitalize"
										>
											{subscription.status}
										</p>
									</div>
								</div>
								<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
									Member since {formatDate(subscription.createdAt)}
								</p>
							</div>
							<Button
								type="button"
								variant={subscription.status === 'subscribed' ? 'outline' : 'default'}
								disabled={saving}
								onclick={toggleStatus}
							>
								{#if saving}
									<Spinner />
									Saving…
								{:else}
									{subscription.status === 'subscribed' ? 'Unsubscribe' : 'Subscribe'}
								{/if}
							</Button>
						{:else}
							<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-[#737373]">
								You are not subscribed to the newsletter yet.
							</p>
							<form class="flex w-full flex-col items-start gap-[12px]" onsubmit={subscribe}>
								<div class="grid w-full max-w-[400px] gap-[6px]">
									<Label for="newsletter-email">Email address</Label>
									<Input
										id="newsletter-email"
										type="email"
										bind:value={email}
										placeholder="you@example.com"
										autocomplete="email"
										required
									/>
								</div>
								{#if formError}
									<p class="text-[14px] leading-[20px] text-[#dc2626]">{formError}</p>
								{/if}
								<Button type="submit" disabled={saving}>
									{#if saving}
										<Spinner />
										Subscribing…
									{:else}
										Subscribe
									{/if}
								</Button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
	<SiteFooter />
</div>
