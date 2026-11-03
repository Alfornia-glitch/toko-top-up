<script lang="ts">
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';

	const imgLeftIcon5 = '/assets/d8cda.svg';

	const instagram = $derived(site.social.instagram);
</script>

{#snippet followContent()}
	<div class="relative size-[16px] shrink-0" data-name="Left icon">
		<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon5} />
	</div>
	<div
		class="relative flex shrink-0 flex-col justify-center font-['Geist:Medium'] text-[14px] leading-[0] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
	>
		<p class="leading-[20px]">Follow Us @shopix</p>
	</div>
{/snippet}

<div
	class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center gap-[32px] overflow-clip bg-white py-[96px]"
	data-name="Testimonials"
>
	<p
		class="relative w-[min-content] min-w-full shrink-0 text-center font-['Geist:Bold'] text-[30px] leading-[36px] font-bold [word-break:break-word] text-[#0a0a0a]"
	>
		Inspired by Our Community
	</p>
	<div
		class="relative flex w-[1600px] shrink-0 content-stretch items-center gap-[16px]"
		data-name="Flex Horizontal"
	>
		{#each home.testimonials as testimonial (testimonial.id)}
			{#if testimonial.link}
				<a
					href={testimonial.link}
					class="group relative aspect-[240/240] min-w-px flex-[1_0_0] overflow-hidden rounded-[8px]"
					data-name="Image"
				>
					{#if testimonial.imageUrl}
						<img
							src={testimonial.imageUrl}
							alt={testimonial.caption ?? 'Community photo'}
							loading="lazy"
							class="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
						/>
					{:else}
						<ImagePlaceholder
							class="pointer-events-none absolute inset-0 rounded-[8px]"
							label={testimonial.caption ?? 'Community photo'}
						/>
					{/if}
				</a>
			{:else}
				<div
					class="relative aspect-[240/240] min-w-px flex-[1_0_0] overflow-hidden rounded-[8px]"
					data-name="Image"
				>
					{#if testimonial.imageUrl}
						<img
							src={testimonial.imageUrl}
							alt={testimonial.caption ?? 'Community photo'}
							loading="lazy"
							class="absolute inset-0 size-full object-cover"
						/>
					{:else}
						<ImagePlaceholder
							class="pointer-events-none absolute inset-0 rounded-[8px]"
							label={testimonial.caption ?? 'Community photo'}
						/>
					{/if}
				</div>
			{/if}
		{/each}
	</div>
	{#if instagram}
		<a
			href={instagram}
			target="_blank"
			rel="noreferrer"
			class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[16px] py-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
			data-name="Outline Button"
		>
			{@render followContent()}
		</a>
	{:else}
		<div
			class="relative flex shrink-0 content-stretch items-center justify-center gap-[6px] overflow-clip rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[16px] py-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
			data-name="Outline Button"
		>
			{@render followContent()}
		</div>
	{/if}
</div>
