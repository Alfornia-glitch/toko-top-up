<script lang="ts">
	import { onMount } from 'svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import CustomerServiceButton from '#lib/frontend/components/CustomerServiceButton.svelte';
	import HeroSection from '#lib/frontend/modules/landing/components/HeroSection.svelte';
	import CategorySection from '#lib/frontend/modules/landing/components/CategorySection.svelte';
	import TestimonialsSection from '#lib/frontend/modules/landing/components/TestimonialsSection.svelte';

	onMount(() => {
		void home.ensure();
		void site.ensure();
	});
</script>

<div
	class="shopix-page relative flex min-h-screen w-full flex-col items-center bg-background text-foreground"
	data-name="Top up - Home page"
>
	<SiteHeader />
	<HeroSection />
	<CategorySection />
	<TestimonialsSection />
	<SiteFooter />
	<CustomerServiceButton />
</div>
