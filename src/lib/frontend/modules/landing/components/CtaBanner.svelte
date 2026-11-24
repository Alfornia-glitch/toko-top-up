<script lang="ts">
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	const imgRightIcon = '/assets/30a38.svg';

	const banner = $derived(home.banner('cta') ?? home.banner('promo'));
</script>

<div
	class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center bg-white"
	data-name="CTA"
>
	{#if banner}
		<div
			class="relative flex h-[400px] w-full max-w-[1280px] shrink-0 flex-col content-stretch items-start px-[32px]"
			data-name="Flex Vertrical"
		>
			<div
				class="relative flex h-[400px] w-full shrink-0 flex-col content-stretch items-center justify-center overflow-clip rounded-[8px]"
				data-name="Flex Vertrical"
			>
				<div class="absolute top-0 left-0 h-[400px] w-full" data-name="Background Image">
					{#if banner.imageUrl}
						<img
							loading="lazy"
							decoding="async"
							src={banner.imageUrl}
							alt={banner.title}
							class="absolute inset-0 size-full object-cover"
						/>
					{:else}
						<ImagePlaceholder variant="dark" class="absolute inset-0" />
					{/if}
				</div>
				<div
					class="absolute top-[210px] left-[461px] flex h-[190px] w-[755px] items-center justify-center"
				>
					<div class="flex-none -rotate-90">
						<div class="relative h-[755px] w-[190px] blur-[12px]" data-name="Layer Blur image">
							<div class="pointer-events-none absolute inset-0 overflow-hidden bg-white/10"></div>
						</div>
					</div>
				</div>
				<div
					class="relative flex h-[400px] w-full max-w-[1280px] shrink-0 flex-col content-stretch items-start justify-center gap-[16px] pl-[40px]"
					data-name="Flex Horizontal"
				>
					<div
						class="relative flex w-full max-w-[605px] shrink-0 flex-col content-stretch items-start gap-[8px] [word-break:break-word] text-white"
						data-name="Flex Vertical"
					>
						<p
							class="relative w-full shrink-0 font-['Geist:Bold'] text-[48px] leading-[normal] font-bold"
						>
							{banner.title}
						</p>
						{#if banner.subtitle}
							<p
								class="relative w-full shrink-0 font-['Geist:Regular'] text-[18px] leading-[28px] font-normal"
							>
								{banner.subtitle}
							</p>
						{/if}
					</div>
					{#if banner.ctaLabel}
						<a
							href={banner.ctaUrl ?? '/products'}
							class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[16px] py-[8px]"
							data-name="Solid button"
						>
							<div
								class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
							>
								<p class="leading-[20px]">{banner.ctaLabel}</p>
							</div>
							<div class="relative size-[16px] shrink-0" data-name="Right icon">
								<img
									loading="lazy"
									decoding="async"
									alt=""
									class="absolute inset-0 block size-full max-w-none"
									src={imgRightIcon}
								/>
							</div>
						</a>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
