<script lang="ts">
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const imgRightIcon = '/assets/30a38.svg';

	const heroBanners = $derived(home.banners.filter((banner) => banner.key === 'hero'));
	const mainBanner = $derived(heroBanners[0]);
	const sideBanners = $derived(heroBanners.slice(1, 4));
</script>

<div
	class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-center justify-center bg-white pt-[56px]"
	data-name="Hero"
>
	{#if mainBanner}
		<div
			class="relative flex w-[1280px] max-w-[1280px] shrink-0 flex-col content-stretch items-start gap-[16px] px-[32px] lg:flex-row lg:items-start"
			data-name="Flex Horizontal"
		>
			<div
				class="relative flex min-w-px flex-auto flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-[#f5f5f5] py-[24px] lg:h-full lg:flex-[1_0_0]"
				data-name="Card"
			>
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start px-[24px]"
					data-name="card-body"
				>
					<div
						class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
						data-name="Flex Vertical"
					>
						<div
							class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px] [word-break:break-word] text-[#0a0a0a]"
							data-name="Flex Vertical"
						>
							<p
								class="relative w-full shrink-0 font-['Geist:Bold'] text-[36px] leading-[40px] font-bold"
							>
								{mainBanner.title}
							</p>
							{#if mainBanner.subtitle}
								<p
									class="relative w-full shrink-0 font-['Geist:Regular'] text-[18px] leading-[28px] font-normal"
								>
									{mainBanner.subtitle}
								</p>
							{/if}
						</div>
						{#if mainBanner.ctaLabel}
							<a
								href={mainBanner.ctaUrl ?? '/products'}
								class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[16px] py-[8px]"
								data-name="Solid button"
							>
								<div
									class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
								>
									<p class="leading-[20px]">{mainBanner.ctaLabel}</p>
								</div>
								<div class="relative size-[16px] shrink-0" data-name="Right icon">
									<img
										alt=""
										class="absolute inset-0 block size-full max-w-none"
										src={imgRightIcon}
									/>
								</div>
							</a>
						{/if}
					</div>
					<div
						class="relative mt-[8px] h-[240px] w-full shrink-0 lg:absolute lg:top-[239px] lg:left-[96px] lg:mt-0 lg:h-[282px] lg:w-[361px]"
						data-name="image"
					>
						{#if mainBanner.imageUrl}
							<img
								src={mainBanner.imageUrl}
								alt={mainBanner.title}
								class="absolute inset-0 size-full object-contain"
							/>
						{:else}
							<ImagePlaceholder class="absolute inset-0" label={mainBanner.title} />
						{/if}
					</div>
				</div>
			</div>
			{#if sideBanners.length > 0}
				<div
					class="relative flex w-full shrink-0 flex-col content-stretch items-start justify-center gap-[16px] lg:h-[581px] lg:w-[329px]"
					data-name="Flex Vertical"
				>
					{#each sideBanners as banner (banner.id)}
						<div
							class="relative flex min-h-px w-full flex-auto flex-col content-stretch items-start gap-[16px] overflow-clip rounded-[14px] bg-[rgba(2,132,199,0.1)] py-[24px] lg:flex-[1_0_0]"
							data-name="Card"
						>
							<div
								class="relative flex w-full shrink-0 flex-col content-stretch items-start px-[24px]"
								data-name="card-body"
							>
								<div
									class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[16px]"
									data-name="Flex Vertical"
								>
									<div
										class="relative flex w-full shrink-0 flex-col content-stretch items-start gap-[8px] [word-break:break-word] text-[#0a0a0a]"
										data-name="Flex Vertical"
									>
										<p
											class="relative w-full shrink-0 font-['Geist:Bold'] text-[24px] leading-[30px] font-bold"
										>
											{banner.title}
										</p>
										{#if banner.subtitle}
											<p
												class="relative w-full shrink-0 font-['Geist:Regular'] text-[14px] leading-[20px] font-normal"
											>
												{banner.subtitle}
											</p>
										{/if}
									</div>
									{#if banner.ctaLabel}
										<a
											href={banner.ctaUrl ?? '/products'}
											class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[12px] py-[6px]"
											data-name="Solid button"
										>
											<div
												class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
											>
												<p class="leading-[20px]">{banner.ctaLabel}</p>
											</div>
											<div class="relative size-[16px] shrink-0" data-name="Right icon">
												<img
													alt=""
													class="absolute inset-0 block size-full max-w-none"
													src={imgRightIcon}
												/>
											</div>
										</a>
									{/if}
								</div>
								<div class="relative mt-[8px] h-[160px] w-full shrink-0" data-name="image">
									{#if banner.imageUrl}
										<img
											src={banner.imageUrl}
											alt={banner.title}
											class="absolute inset-0 size-full object-contain"
										/>
									{:else}
										<ImagePlaceholder class="absolute inset-0" label={banner.title} />
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
