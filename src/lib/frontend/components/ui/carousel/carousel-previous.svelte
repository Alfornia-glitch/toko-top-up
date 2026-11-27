<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import { Button, type Props } from '#lib/frontend/components/ui/button/index.ts';
	import { cn } from '#lib/frontend/utils.ts';
	import { getEmblaContext } from './context.ts';
	import type { WithoutChildren } from 'bits-ui';

	let {
		ref = $bindable(null),
		class: className,
		variant = 'outline',
		size = 'icon-sm',
		...restProps
	}: WithoutChildren<Props> = $props();

	const emblaCtx = getEmblaContext('<Carousel.Previous/>');
</script>

<Button
	data-slot="carousel-previous"
	{variant}
	{size}
	aria-disabled={!emblaCtx.canScrollPrev}
	disabled={!emblaCtx.canScrollPrev}
	class={cn(
		'absolute touch-manipulation rounded-full',
		emblaCtx.orientation === 'horizontal'
			? 'inset-y-0 -start-12 my-auto'
			: 'start-1/2 -top-12 -translate-x-1/2 rotate-90',
		className
	)}
	onclick={emblaCtx.scrollPrev}
	onkeydown={emblaCtx.handleKeyDown}
	{...restProps}
	bind:ref
>
	<ChevronLeftIcon class="cn-rtl-flip" />
	<span class="sr-only">{m.ui_carousel_previous_slide()}</span>
</Button>
