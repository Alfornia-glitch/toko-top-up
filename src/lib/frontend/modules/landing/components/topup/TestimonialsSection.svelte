<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Carousel from '#lib/frontend/components/ui/carousel/index.ts';
	import ImagePlaceholder from '#lib/frontend/components/ui/ImagePlaceholder.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import type { Testimonial } from '#lib/frontend/modules/commerce/models.ts';

	const imgLeftIcon5 = '/assets/d8cda.svg';

	const instagram = $derived(site.social.instagram);

	const testimonials = $derived(home.testimonials);
	const controlClass =
		'static size-10 translate-y-0 bg-background hover:bg-accent disabled:opacity-40';
</script>

{#snippet tile(testimonial: Testimonial)}
	{@const label = testimonial.caption ?? m.components_landing_testimonials_photo()}
	<svelte:element
		this={testimonial.link ? 'a' : 'div'}
		href={testimonial.link ?? undefined}
		class="group relative block aspect-square overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
		data-name="Image"
	>
		{#if testimonial.imageUrl}
			<img
				src={testimonial.imageUrl}
				alt={label}
				loading="lazy"
				draggable="false"
				class="absolute inset-0 size-full object-cover transition duration-300 group-hover:scale-105"
			/>
		{:else}
			<ImagePlaceholder class="pointer-events-none absolute inset-0 rounded-lg" {label} />
		{/if}
		{#if testimonial.caption}
			<p
				class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-sm text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
			>
				{testimonial.caption}
			</p>
		{/if}
	</svelte:element>
{/snippet}

{#if testimonials.length > 0}
	<div
		class="relative flex w-full shrink-0 flex-col items-center justify-center gap-[32px] py-[64px]"
		data-name="Testimonials"
	>
		<Carousel.Root
			opts={{ align: 'start', slidesToScroll: 'auto' }}
			class="flex w-full flex-col px-8"
		>
			<div class="flex w-full items-center gap-[16px]">
				<p class="min-w-px flex-1 font-['Geist:Bold'] text-xl font-bold">
					{m.components_landing_testimonials_title()}
				</p>
				{#if home.testimonials.length}
					<div class="flex items-center gap-[8px]">
						<Carousel.Previous variant="outline" size="icon" class={controlClass} />
						<Carousel.Next variant="outline" size="icon" class={controlClass} />
					</div>
				{/if}
			</div>
			{#if home.testimonials.length}
				<Carousel.Content class="-ms-[16px]">
					{#each home.testimonials as testimonial (testimonial.id)}
						<Carousel.Item class="basis-1/2 ps-[16px] sm:basis-1/3 lg:basis-1/5">
							{@render tile(testimonial)}
						</Carousel.Item>
					{/each}
				</Carousel.Content>
			{/if}
		</Carousel.Root>
		{#if instagram}
			<Button variant="outline" href={instagram} target="_blank" rel="noreferrer" class="h-9 px-4">
				<img loading="lazy" decoding="async" alt="" class="size-4" src={imgLeftIcon5} />
				{m.components_landing_testimonials_instagram()}
			</Button>
		{/if}
	</div>
{/if}
