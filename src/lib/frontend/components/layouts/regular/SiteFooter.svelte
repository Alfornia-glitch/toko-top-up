<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import {
		FOOTER_EXPLORE,
		FOOTER_FEATURES,
		footerLegal,
		FOOTER_TERMS
	} from '#lib/frontend/content/navigation.regular.ts';
	import {
		imgEllipse90,
		imgGroup,
		imgGroup3,
		imgIcon4,
		imgIcon5,
		imgIcon6,
		imgAppleIcon,
		imgGroup4,
		imgShield,
		imgIcon7,
		imgIcon8,
		imgIcon9,
		imgCardBody14,
		imgCardBody15,
		imgCardBody16
	} from '#lib/frontend/shellAssets.ts';

	let { features = false }: { features?: boolean } = $props();

	let email = $state('');
	let newsletterState = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let newsletterMessage = $state('');

	const socials = $derived([
		{ name: 'instagram', href: site.social.instagram, icon: imgIcon7 },
		{ name: 'facebook', href: site.social.facebook, icon: imgIcon8 },
		{ name: 'twitter', href: site.social.twitter, icon: imgIcon9 }
	]);

	onMount(() => {
		void site.ensure();
	});

	async function subscribe(event: SubmitEvent) {
		event.preventDefault();
		if (newsletterState === 'loading') return;

		newsletterState = 'loading';
		newsletterMessage = '';

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (!response.ok) throw new Error(m.components_regular_newsletter_failed());

			newsletterState = 'success';
			newsletterMessage = m.components_regular_newsletter_success();
			email = '';
		} catch (error) {
			newsletterState = 'error';
			newsletterMessage =
				error instanceof Error ? error.message : m.components_regular_newsletter_failed();
		}
	}
</script>

<div
	class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center gap-[32px] bg-white"
	data-name="Footer"
>
	{#if features}
		<div
			class="relative flex w-full max-w-[1280px] shrink-0 content-stretch items-start gap-[24px] px-[32px] max-md:flex-col max-md:gap-3 max-md:px-4"
			data-name="Flex Horizontal"
		>
			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)] max-md:w-full"
				data-name="Card"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start px-[16px]"
					data-name="card-body"
				>
					<div class="relative flex w-full shrink-0 content-stretch items-start gap-[24px]">
						<div
							class="relative flex shrink-0 content-stretch items-center justify-center rounded-[9999px] bg-[#f5f5f5] p-[12px]"
							data-name="icon"
						>
							<div class="relative size-[24px] shrink-0" data-name="ICON">
								<img
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgCardBody14}
								/>
							</div>
						</div>
						<div
							class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[6px] leading-[28px] [word-break:break-word]"
							data-name="Free delivery"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] font-semibold text-[#0a0a0a]"
							>
								{FOOTER_FEATURES[0].title}
							</p>
							<p
								class="relative w-full shrink-0 font-['Geist:Regular'] text-[18px] font-normal text-[#737373]"
							>
								{FOOTER_FEATURES[0].text}
							</p>
						</div>
					</div>
				</div>
			</div>
			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)] max-md:w-full"
				data-name="Card"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start px-[16px]"
					data-name="card-body"
				>
					<div class="relative flex w-full shrink-0 content-stretch items-start gap-[24px]">
						<div
							class="relative flex shrink-0 content-stretch items-center justify-center rounded-[9999px] bg-[#f5f5f5] p-[12px]"
							data-name="icon"
						>
							<div class="relative size-[24px] shrink-0" data-name="ICON">
								<img
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgCardBody15}
								/>
							</div>
						</div>
						<div
							class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[6px] leading-[28px] [word-break:break-word]"
							data-name="Free delivery"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] font-semibold text-[#0a0a0a]"
							>
								{FOOTER_FEATURES[1].title}
							</p>
							<p
								class="relative w-full shrink-0 font-['Geist:Regular'] text-[18px] font-normal text-[#737373]"
							>
								{FOOTER_FEATURES[1].text}
							</p>
						</div>
					</div>
				</div>
			</div>
			<div
				class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-white py-[16px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)] max-md:w-full"
				data-name="Card"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start px-[16px]"
					data-name="card-body"
				>
					<div class="relative flex w-full shrink-0 content-stretch items-start gap-[24px]">
						<div
							class="relative flex shrink-0 content-stretch items-center justify-center rounded-[9999px] bg-[#f5f5f5] p-[12px]"
							data-name="icon"
						>
							<div class="relative flex shrink-0 items-center justify-center">
								<div class="flex-none -scale-y-100 rotate-180">
									<div class="relative size-[24px]" data-name="ICON">
										<img
											alt=""
											class="absolute inset-0 block size-full max-w-none"
											src={imgCardBody16}
										/>
									</div>
								</div>
							</div>
						</div>
						<div
							class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[6px] leading-[28px] [word-break:break-word]"
							data-name="Free delivery"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[20px] font-semibold text-[#0a0a0a]"
							>
								{FOOTER_FEATURES[2].title}
							</p>
							<p
								class="relative w-full shrink-0 font-['Geist:Regular'] text-[18px] font-normal text-[#737373]"
							>
								{FOOTER_FEATURES[2].text}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
	<div
		class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center border-t border-b border-solid border-[#e5e5e5]"
		data-name="Flex Vertical"
	>
		<div
			class="relative flex w-full max-w-[1280px] shrink-0 flex-wrap content-start items-start gap-[32px] px-[32px] py-[56px] max-[480px]:px-3.5 max-[480px]:py-9 max-md:flex-col max-md:gap-6"
			data-name="Flex Horizontal"
		>
			<div
				class="relative flex w-[331px] min-w-[328px] shrink-0 flex-col content-stretch items-start justify-center gap-[32px]"
				data-name="Flex Vertical"
			>
				<a
					href="/"
					class="relative flex h-[32px] shrink-0 content-stretch items-center gap-[6px]"
					data-name="shopix-logo"
				>
					<div
						class="relative inline-grid shrink-0 grid-cols-[max-content] grid-rows-[max-content] place-items-start leading-[0]"
					>
						<div class="relative col-1 row-1 mt-0 ml-0 size-[28px]">
							<div class="absolute inset-[-3.57%]">
								<img alt="" class="block size-full max-w-none" src={imgEllipse90} />
							</div>
						</div>
						<div
							class="relative col-1 row-1 mt-0 ml-0 inline-grid grid-cols-[max-content] grid-rows-[max-content] place-items-start"
							data-name="Mask group"
						>
							<div
								class="relative col-1 row-1 mt-[5px] ml-[4px] inline-grid grid-cols-[max-content] grid-rows-[max-content] place-items-start"
								data-name="Group"
							>
								<div
									class="relative col-1 row-1 mt-0 ml-0 h-[23.917px] w-[20px] mask-intersect mask-alpha mask-size-[28px_28px] mask-no-clip mask-position-[-4px_-5px] mask-no-repeat"
									style="mask-image: url('{imgGroup}')"
									data-name="Group"
								>
									<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgGroup3} />
								</div>
							</div>
						</div>
					</div>
					<div class="relative flex shrink-0 content-stretch items-center justify-center pt-[2px]">
						<div
							class="relative flex shrink-0 flex-col justify-end font-['Inter:Semi_Bold'] text-[20px] leading-[0] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a] not-italic"
						>
							<p class="leading-[26px]">Shopix</p>
						</div>
					</div>
				</a>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[12px]"
					data-name="Contact Information"
				>
					<div
						class="relative flex w-full shrink-0 content-stretch items-start gap-[8px]"
						data-name="Location"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon4} />
						</div>
						<div
							class="relative w-[255px] shrink-0 font-['Geist:Regular'] text-[16px] leading-[0] font-normal [word-break:break-word] text-[#0a0a0a]"
						>
							<p class="mb-0 leading-[24px]">{site.contact.address1}</p>
							<p class="leading-[24px]">{site.contact.address2}</p>
						</div>
					</div>
					<div
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px]"
						data-name="Phone"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon5} />
						</div>
						<p
							class="relative min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#0a0a0a]"
						>
							{site.contact.phone}
						</p>
					</div>
					<div
						class="relative flex w-full shrink-0 content-stretch items-center gap-[8px]"
						data-name="Email"
					>
						<div class="relative size-[20px] shrink-0" data-name="Icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon6} />
						</div>
						<p
							class="relative min-w-px flex-[1_0_0] font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#0a0a0a]"
						>
							{site.contact.email}
						</p>
					</div>
				</div>
			</div>
			<div
				class="relative flex w-[215px] shrink-0 flex-col content-stretch items-start justify-center gap-[12px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 content-stretch items-center pb-[8px]"
					data-name="Header"
				>
					<p
						class="relative min-w-px flex-[1_0_0] font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
					>
						{m.components_regular_footer_explore()}
					</p>
				</div>
				<p
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373]"
				>
					{FOOTER_EXPLORE[0].label}
				</p>
				<p
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373]"
				>
					{FOOTER_EXPLORE[1].label}
				</p>
				<a
					href="/account/order-tracking"
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373] hover:text-[#0a0a0a] hover:underline"
				>
					{m.components_regular_footer_order_tracking()}
				</a>
				<p
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373]"
				>
					{FOOTER_EXPLORE[2].label}
				</p>
			</div>
			<div
				class="relative flex w-[246px] shrink-0 flex-col content-stretch items-start justify-center gap-[12px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 content-stretch items-center pb-[8px]"
					data-name="Header"
				>
					<p
						class="relative min-w-px flex-[1_0_0] font-['Geist:SemiBold'] text-[20px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
					>
						{m.components_regular_footer_terms()}
					</p>
				</div>
				<a
					href="/account/returns-refunds"
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373] hover:text-[#0a0a0a] hover:underline"
					>{m.components_regular_footer_returns()}</a
				>
				<a
					href="/privacy-policy"
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373] hover:text-[#0a0a0a] hover:underline"
				>
					{FOOTER_TERMS[0].label}
				</a>
				<a
					href="/help/purchase-protection"
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373] hover:text-[#0a0a0a] hover:underline"
				>
					{FOOTER_TERMS[1].label}
				</a>
				<a
					href="/help"
					class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-[#737373] hover:text-[#0a0a0a] hover:underline"
				>
					{FOOTER_TERMS[2].label}
				</a>
			</div>
			<div
				class="relative flex min-w-[246px] flex-[1_0_0] flex-col content-stretch items-start justify-center gap-[24px]"
				data-name="Flex Vertical"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[10px]"
					data-name="Container"
				>
					<p
						class="relative shrink-0 font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
					>
						{m.components_regular_newsletter_title()}
					</p>
					<div
						class="relative flex w-full shrink-0 content-stretch items-center justify-end"
						data-name="Subscribe"
					>
						<div
							class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start gap-[8px] max-md:hidden"
							data-name="Default Input"
						>
							<form
								class="relative flex w-full shrink-0 content-stretch items-start"
								data-name="input-container"
								onsubmit={subscribe}
							>
								<div
									class="relative flex h-[36px] min-w-px flex-[1_0_0] content-stretch items-center gap-[8px] rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px]"
									data-name="input"
								>
									<input
										type="email"
										required
										bind:value={email}
										placeholder={m.components_regular_newsletter_email()}
										aria-label={m.components_regular_newsletter_email()}
										class="min-w-0 flex-[1_0_0] border-none bg-transparent font-['Geist:Regular'] text-[14px] leading-[20px] font-normal text-[#0a0a0a] outline-none placeholder:text-[#737373]"
									/>
									<button
										type="submit"
										disabled={newsletterState === 'loading'}
										class="shrink-0 rounded-[6px] bg-[#0a0a0a] px-[10px] py-[4px] font-['Geist:Medium'] text-[12px] leading-[16px] font-medium text-white disabled:opacity-50"
									>
										{newsletterState === 'loading'
											? m.components_regular_newsletter_joining()
											: m.components_regular_newsletter_subscribe()}
									</button>
								</div>
							</form>
							{#if newsletterMessage}
								<p
									class={newsletterState === 'success'
										? "font-['Geist:Regular'] text-[12px] leading-[16px] text-[#16a34a]"
										: "font-['Geist:Regular'] text-[12px] leading-[16px] text-[#dc2626]"}
									role="status"
									aria-live="polite"
								>
									{newsletterMessage}
								</p>
							{/if}
						</div>
					</div>
				</div>
				<div class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[10px]">
					<p
						class="relative w-[min-content] min-w-full shrink-0 font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] text-[#0a0a0a]"
					>
						{m.components_regular_footer_download()}
					</p>
					<div
						class="relative flex shrink-0 content-stretch items-start gap-[16px]"
						data-name="Actions"
					>
						{#snippet appStoreBadge()}
							<div class="relative h-[23.571px] w-[19.194px] shrink-0" data-name="apple-icon">
								<img
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgAppleIcon}
								/>
							</div>
							<div
								class="relative flex shrink-0 flex-col content-stretch items-center justify-center [word-break:break-word] whitespace-nowrap text-white"
								data-name="Text"
							>
								<p
									class="relative shrink-0 font-['Geist:Regular'] text-[10.102px] leading-[13.469px] font-normal"
								>
									{m.components_regular_footer_download_on()}
								</p>
								<p
									class="relative shrink-0 font-['Geist:Medium'] text-[11.786px] leading-[16.837px] font-medium opacity-92"
								>
									App Store
								</p>
							</div>
						{/snippet}
						{#snippet googlePlayBadge()}
							<div
								class="relative size-[22.815px] shrink-0 overflow-clip"
								data-name="google-play-icon"
							>
								<div class="absolute inset-[6.18%_13.37%] contents" data-name="_x31_52-google-play">
									<div class="absolute inset-[6.18%_13.37%]" data-name="Group">
										<img
											alt=""
											class="absolute inset-0 block size-full max-w-none"
											src={imgGroup4}
										/>
									</div>
								</div>
							</div>
							<div
								class="relative flex shrink-0 flex-col content-stretch items-center justify-center [word-break:break-word] whitespace-nowrap text-white"
								data-name="Text"
							>
								<p
									class="relative shrink-0 font-['Geist:Regular'] text-[9.778px] leading-[13.037px] font-normal"
								>
									{m.components_regular_footer_download_on()}
								</p>
								<p
									class="relative shrink-0 font-['Geist:Medium'] text-[11.407px] leading-[16.296px] font-medium opacity-92"
								>
									Google Play
								</p>
							</div>
						{/snippet}
						{#if site.downloads.appStore}
							<a
								href={site.downloads.appStore}
								target="_blank"
								rel="noopener noreferrer"
								class="relative flex shrink-0 content-stretch items-center gap-[13.469px] rounded-[5.051px] bg-black px-[10.102px] py-[5.051px]"
								data-name="Button"
							>
								{@render appStoreBadge()}
							</a>
						{:else}
							<div
								class="relative flex shrink-0 content-stretch items-center gap-[13.469px] rounded-[5.051px] bg-black px-[10.102px] py-[5.051px]"
								data-name="Button"
							>
								{@render appStoreBadge()}
							</div>
						{/if}
						{#if site.downloads.googlePlay}
							<a
								href={site.downloads.googlePlay}
								target="_blank"
								rel="noopener noreferrer"
								class="relative flex shrink-0 content-stretch items-center justify-center gap-[13.037px] rounded-[4.889px] bg-black px-[9.778px] py-[4.889px]"
								data-name="Button"
							>
								{@render googlePlayBadge()}
							</a>
						{:else}
							<div
								class="relative flex shrink-0 content-stretch items-center justify-center gap-[13.037px] rounded-[4.889px] bg-black px-[9.778px] py-[4.889px]"
								data-name="Button"
							>
								{@render googlePlayBadge()}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
		<div
			class="relative flex w-full shrink-0 flex-wrap content-center items-center justify-center gap-y-[32px] border-t border-b border-solid border-[#e5e5e5] px-[96px] py-[24px]"
			data-name="Payments Method"
		>
			<div
				class="relative flex min-w-px flex-[1_0_0] flex-wrap content-center items-center justify-center gap-[16px]"
				data-name="icon"
			>
				<div
					class="relative flex shrink-0 content-stretch items-center gap-[8px] rounded-[9999px] border border-solid border-[#e5e5e5] px-[14px] py-[4px]"
					data-name="Secure Payment"
				>
					<div class="relative size-[20px] shrink-0" data-name="shield">
						<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgShield} />
					</div>
					<p
						class="relative shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
					>
						{m.components_regular_footer_secure_payment()}
					</p>
				</div>
			</div>
		</div>
		<div
			class="relative flex w-full shrink-0 content-stretch items-start justify-center py-[24px] max-md:flex-col max-md:gap-6"
			data-name="Flex Horizontal"
		>
			<div
				class="relative flex max-w-[1280px] min-w-px flex-[1_0_0] content-stretch items-start justify-center gap-[24px] px-[32px] max-[480px]:px-3.5"
			>
				<div
					class="relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-center max-md:hidden"
					data-name="Row"
				>
					<p
						class="relative min-w-[329px] flex-[1_0_0] font-['Geist:Medium'] text-[16px] leading-[0] font-medium [word-break:break-word] text-[#0a0a0a]"
					>
						<span class="leading-[24px]">{footerLegal()}</span>
					</p>
				</div>
				<div
					class="relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-end gap-[13px]"
				>
					{#each socials as social (social.name)}
						{#if social.href}
							<a
								href={social.href}
								target="_blank"
								rel="noopener noreferrer"
								class="relative size-[22px] shrink-0"
								data-name="Icon"
							>
								<img alt="" class="absolute inset-0 block size-full max-w-none" src={social.icon} />
							</a>
						{:else}
							<div class="relative size-[22px] shrink-0" data-name="Icon">
								<img alt="" class="absolute inset-0 block size-full max-w-none" src={social.icon} />
							</div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
