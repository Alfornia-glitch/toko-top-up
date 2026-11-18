<script lang="ts">
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import StorefrontProductCard from '#lib/frontend/components/storefront/StorefrontProductCard.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const imgIcon4 = '/assets/b9233.svg';
	const imgIcon5 = '/assets/785e8.svg';
	const imgRightIcon1 = '/assets/c6b74.svg';

	let now = $state(Date.now());

	const dealEndsAt = $derived(
		home.deals
			.map((deal) => deal.dealEndsAt)
			.filter((value): value is string => typeof value === 'string' && value.length > 0)
			.map((value) => new Date(value).getTime())
			.filter((time) => Number.isFinite(time) && time > now)
			.sort((a, b) => a - b)[0] ?? null
	);
	const remaining = $derived(dealEndsAt ? Math.max(0, dealEndsAt - now) : 0);
	const hasCountdown = $derived(dealEndsAt !== null && remaining > 0);
	const days = $derived(String(Math.floor(remaining / 86400000)).padStart(2, '0'));
	const hours = $derived(String(Math.floor((remaining % 86400000) / 3600000)).padStart(2, '0'));
	const minutes = $derived(String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0'));
	const seconds = $derived(String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0'));

	const promoBanner = $derived(home.banner('promo'));
	const firstDeal = $derived(home.deals[0]);
	const featuredTitle = $derived(promoBanner?.title ?? firstDeal?.name ?? '');
	const featuredSubtitle = $derived(promoBanner?.subtitle ?? firstDeal?.shortDescription ?? null);
	const featuredImage = $derived(promoBanner?.imageUrl || firstDeal?.imageUrl || '');
	const featuredHref = $derived(promoBanner?.ctaUrl ?? '/products?deal=true');
	const featuredCta = $derived(promoBanner?.ctaLabel ?? 'Shop Now');

	$effect(() => {
		if (dealEndsAt === null) return;

		const interval = setInterval(() => {
			now = Date.now();
		}, 1000);

		return () => clearInterval(interval);
	});
</script>

<div
	class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center bg-white py-[96px] max-[480px]:py-9"
	data-name="Feature"
>
	<div
		class="relative flex w-full max-w-[1280px] shrink-0 flex-col content-stretch items-center justify-center gap-[32px] px-[32px] max-[480px]:px-3.5"
		data-name="Flex Vertical"
	>
		<div
			class="relative flex w-full shrink-0 content-stretch items-center justify-between gap-[16px]"
			data-name="Flex Horizontal"
		>
			<p
				class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-[#0a0a0a] max-[480px]:text-2xl max-[480px]:leading-8"
			>
				Deals of the Day 🔥
			</p>
			<div class="relative flex shrink-0 items-center gap-[16px]">
				<a
					href="/products?deal=true"
					class="shrink-0 font-['Geist:Medium'] text-[18px] leading-[28px] font-medium text-[#0a0a0a] transition hover:text-[#525252]"
				>
					View All
				</a>
				<div
					class="relative flex w-[67px] shrink-0 content-stretch items-center justify-between"
					data-name="Pagination Icon"
				>
					<div class="relative flex shrink-0 items-center justify-center">
						<div class="flex-none -scale-y-100 rotate-180">
							<div class="relative size-[30px]" data-name="ICON">
								<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon4} />
							</div>
						</div>
					</div>
					<div class="relative size-[30px] shrink-0" data-name="ICON">
						<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon5} />
					</div>
				</div>
			</div>
		</div>
		<div
			class="relative grid w-full shrink-0 grid-cols-1 content-stretch items-start gap-[16px] sm:grid-cols-2 lg:grid-cols-4"
			data-name="Flex Horizontal"
		>
			{#if featuredTitle}
				<div
					class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-start self-stretch overflow-clip rounded-[14px] py-[24px] shadow-[0px_0px_0px_1px_rgba(10,10,10,0.1)]"
					data-name="Card"
				>
					{#if featuredImage}
						<img
							src={featuredImage}
							alt={featuredTitle}
							class="pointer-events-none absolute inset-0 size-full rounded-[14px] object-cover"
						/>
						<div class="pointer-events-none absolute inset-0 rounded-[14px] bg-black/40"></div>
					{:else}
						<ImagePlaceholder
							variant="dark"
							class="pointer-events-none absolute inset-0 rounded-[14px]"
						/>
					{/if}
					<div
						class="relative flex min-h-px w-full flex-[1_0_0] flex-col content-stretch items-start justify-between px-[24px]"
						data-name="card-body"
					>
						<div
							class="relative flex w-full shrink-0 content-stretch items-center justify-center"
							data-name="Flex Vertical"
						>
							<p
								class="relative min-w-px flex-[1_0_0] font-['Geist:Bold'] text-[36px] leading-[40px] font-bold [word-break:break-word] text-white max-[480px]:text-2xl max-[480px]:leading-8"
							>
								{featuredTitle}
							</p>
						</div>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[24px]"
							data-name="Flex Vertical"
						>
							{#if featuredSubtitle}
								<p
									class="relative w-full shrink-0 font-['Geist:Regular'] text-[16px] leading-[24px] font-normal [word-break:break-word] text-white"
								>
									{featuredSubtitle}
								</p>
							{/if}
							{#if hasCountdown}
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px]"
									data-name="Flex Vertical"
								>
									<p
										class="relative w-full shrink-0 font-['Geist:SemiBold'] text-[16px] leading-[24px] font-semibold [word-break:break-word] text-white"
									>
										Offers end today:
									</p>
									<div
										class="relative flex w-full shrink-0 content-stretch items-center gap-[8px]"
										data-name="Flex Horizontal"
									>
										<div
											class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[4.921px] max-[480px]:min-w-[60px]"
											data-name="Timer Blocks"
										>
											<div
												class="relative flex h-[55px] w-full shrink-0 flex-col content-stretch items-center justify-center rounded-[6px] bg-white p-[6px]"
												data-name="Timer/Number/Cell"
											>
												<p
													class="relative shrink-0 text-center font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
												>
													{days}
												</p>
											</div>
											<p
												class="relative w-full shrink-0 text-center font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-white"
											>
												Day
											</p>
										</div>
										<div
											class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[4.921px] max-[480px]:min-w-[60px]"
											data-name="Timer Blocks"
										>
											<div
												class="relative flex h-[55px] w-full shrink-0 flex-col content-stretch items-center justify-center rounded-[6px] bg-white p-[6px]"
												data-name="Timer/Number/Cell"
											>
												<p
													class="relative shrink-0 text-center font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
												>
													{hours}
												</p>
											</div>
											<p
												class="relative w-full shrink-0 text-center font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-white"
											>
												Hours
											</p>
										</div>
										<div
											class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[4.921px] max-[480px]:min-w-[60px]"
											data-name="Timer Blocks"
										>
											<div
												class="relative flex h-[55px] w-full shrink-0 flex-col content-stretch items-center justify-center rounded-[6px] bg-white p-[6px]"
												data-name="Timer/Number/Cell"
											>
												<p
													class="relative shrink-0 text-center font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
												>
													{minutes}
												</p>
											</div>
											<p
												class="relative w-full shrink-0 text-center font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-white"
											>
												Min
											</p>
										</div>
										<div
											class="relative flex min-w-px flex-[1_0_0] flex-col content-stretch items-center gap-[4.921px] max-[480px]:min-w-[60px]"
											data-name="Timer Blocks"
										>
											<div
												class="relative flex h-[55px] w-full shrink-0 flex-col content-stretch items-center justify-center rounded-[6px] bg-white p-[6px]"
												data-name="Timer/Number/Cell"
											>
												<p
													class="relative shrink-0 text-center font-['Geist:SemiBold'] text-[18px] leading-[28px] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
												>
													{seconds}
												</p>
											</div>
											<p
												class="relative w-full shrink-0 text-center font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] text-white"
											>
												Sec
											</p>
										</div>
									</div>
								</div>
							{/if}
							<a
								href={featuredHref}
								class="relative flex w-full shrink-0 content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] bg-[#dc2626] px-[10px] py-[6px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
								data-name="Solid Button"
							>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#fafafa]"
								>
									<p class="leading-[20px]">{featuredCta}</p>
								</div>
								<div class="relative size-[16px] shrink-0" data-name="Right-icon">
									<img
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgRightIcon1}
									/>
								</div>
							</a>
						</div>
					</div>
				</div>
			{/if}
			{#each home.deals as deal (deal.id)}
				<StorefrontProductCard product={deal} />
			{/each}
		</div>
	</div>
</div>
