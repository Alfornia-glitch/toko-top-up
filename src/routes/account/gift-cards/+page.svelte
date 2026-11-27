<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage, statusLabel } from '#lib/frontend/i18n/index.ts';
	import { listGiftCards, isUnauthorized } from '#lib/frontend/modules/account/index.ts';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import AccountSidebar from '#lib/frontend/components/AccountSidebar.svelte';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';

	import { formatDate, formatMoney } from '#frontend/modules/commerce/format.ts';
	import type { GiftCardSummary } from '#frontend/modules/commerce/models.ts';

	const imgHeroImage = '/assets/gift-card-hero.svg';
	const imgRightIcon = '/assets/c6b74.svg';

	let cards = $state<GiftCardSummary[]>([]);
	let loading = $state(true);
	let loadError = $state('');

	function redirectToLogin(): void {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function failureMessage(cause: unknown): string {
		if (isUnauthorized(cause)) {
			redirectToLogin();
			return '';
		}

		return errorMessage(cause, 'common_something_went_wrong');
	}

	async function loadCards(): Promise<void> {
		loading = true;
		loadError = '';

		try {
			cards = await listGiftCards();
		} catch (cause) {
			loadError = failureMessage(cause);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadCards();
	});
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-card"
	data-name="Shopix - Giftcards"
>
	<SiteHeader />
	<div
		class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-card py-[56px] max-[480px]:py-9"
		data-name="Gift card"
	>
		<div
			class="relative flex w-full max-w-[1280px] min-w-[328px] shrink-0 content-stretch items-start gap-[24px] px-[32px] max-[480px]:px-3.5"
			data-name="Flex Horizontal"
		>
			<AccountSidebar />
			<div
				class="relative flex w-[893px] max-w-full shrink-0 flex-col content-stretch items-start gap-[14px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 content-stretch items-center gap-[10px] overflow-clip rounded-[6px] bg-muted p-[24px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex w-[474px] max-w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						<div
							class="relative flex w-full max-w-[1280px] shrink-0 flex-col content-stretch items-start gap-[6px] [word-break:break-word]"
							data-name="block-heading"
						>
							<p
								class="relative w-[min-content] min-w-full shrink-0 font-['Geist:SemiBold'] text-[24px] leading-[32px] font-semibold text-foreground"
							>
								{m.account_gift_cards_hero_title()}
							</p>
							<p
								class="relative w-[min-content] min-w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal text-muted-foreground"
							>
								{m.account_gift_cards_hero_description()}
							</p>
						</div>
						<a
							href="/products"
							class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] bg-primary px-[12px] py-[6px]"
							data-name="Button"
						>
							<div
								class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-primary-foreground"
							>
								<p class="leading-[20px]">{m.account_gift_cards_send()}</p>
							</div>
							<div class="relative size-[16px] shrink-0" data-name="Right-icon">
								<img
									loading="lazy"
									decoding="async"
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgRightIcon}
								/>
							</div>
						</a>
					</div>
					<div
						class="absolute top-[8px] left-[604px] hidden h-[213.833px] w-[255.437px] items-center justify-center lg:flex"
					>
						<div class="flex-none rotate-[3.38deg]">
							<div class="relative h-[199.803px] w-[244.093px]" data-name="Hero Image">
								<div class="pointer-events-none absolute inset-0 overflow-hidden">
									<img
										loading="lazy"
										decoding="async"
										alt=""
										class="absolute top-[-8.32%] left-[-26.89%] h-[139.03%] w-[151.74%] max-w-none"
										src={imgHeroImage}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
					data-name="Flex Vertical"
				>
					<p
						class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
					>
						{m.account_gift_cards_title()}
					</p>

					{#if loadError}
						<p class="w-full text-[14px] leading-[20px] text-destructive">{loadError}</p>
					{/if}

					{#if loading}
						<div class="flex w-full items-center justify-center py-[24px]">
							<Spinner class="size-6" aria-label={m.account_gift_cards_loading()} />
						</div>
					{:else if cards.length === 0}
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-card p-[24px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
							data-name="Card"
						>
							<p class="font-['Geist:Regular'] text-[16px] leading-[24px] text-muted-foreground">
								{m.account_gift_cards_empty()}
							</p>
						</div>
					{:else}
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[14px]"
							data-name="Flex Vertical"
						>
							{#each cards as card (card.id)}
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-card p-[24px] shadow-[0px_0px_0px_1px_color-mix(in_oklab,var(--foreground)_10%,transparent)]"
									data-name="Card"
								>
									<div
										class="relative flex w-full shrink-0 flex-wrap content-start items-center justify-between gap-[12px]"
										data-name="Flex Horizontal"
									>
										<p
											class="relative shrink-0 font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] text-foreground"
										>
											{card.code}
										</p>
										<div
											class="relative flex shrink-0 content-stretch items-center justify-center gap-[2px] rounded-[9999px] border border-solid border-border px-[6px] py-[2px]"
											data-name="Outline Badge"
										>
											<p
												class="relative flex shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[16px] font-medium whitespace-nowrap text-foreground capitalize"
											>
												{statusLabel('gift_card', card.status)}
											</p>
										</div>
									</div>
									<div
										class="relative flex w-full shrink-0 flex-wrap content-start items-start gap-x-[24px] gap-y-[8px] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word]"
										data-name="Flex Horizontal"
									>
										<p class="relative shrink-0 text-muted-foreground">
											{m.account_gift_cards_initial({
												amount: formatMoney(card.initialAmount, card.currency)
											})}
										</p>
										<p class="relative shrink-0 text-foreground">
											{m.account_gift_cards_balance({
												amount: formatMoney(card.balance, card.currency)
											})}
										</p>
										<p class="relative shrink-0 text-muted-foreground">
											{m.account_gift_cards_currency({ currency: card.currency })}
										</p>
										<p class="relative shrink-0 text-muted-foreground">
											{card.expiresAt
												? m.account_gift_cards_expires({ date: formatDate(card.expiresAt) })
												: m.account_gift_cards_no_expiry()}
										</p>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
	<SiteFooter />
</div>
