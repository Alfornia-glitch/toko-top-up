<script lang="ts">
	import { onMount } from 'svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import HeroSection from '#lib/frontend/modules/landing/components/HeroSection.svelte';
	import CategorySection from '#lib/frontend/modules/landing/components/CategorySection.svelte';
	import DealsSection from '#lib/frontend/modules/landing/components/DealsSection.svelte';
	import BrandsSection from '#lib/frontend/modules/landing/components/BrandsSection.svelte';
	import NewArrivalsSection from '#lib/frontend/modules/landing/components/NewArrivalsSection.svelte';
	import CtaBanner from '#lib/frontend/modules/landing/components/CtaBanner.svelte';
	import PopularProductsSection from '#lib/frontend/modules/landing/components/PopularProductsSection.svelte';
	import TestimonialsSection from '#lib/frontend/modules/landing/components/TestimonialsSection.svelte';
	import StorefrontLiveSection from '#lib/frontend/components/storefront/StorefrontLiveSection.svelte';

	onMount(() => {
		void home.ensure();
		void site.ensure();
	});
</script>

<div
	class="shopix-page relative flex min-h-screen w-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Home page"
>
	<SiteHeader announcementCount={2} />
	<HeroSection />
	<CategorySection />
	<StorefrontLiveSection />
	<DealsSection />
	<BrandsSection />
	<NewArrivalsSection />
	<CtaBanner />
	<PopularProductsSection />
	<TestimonialsSection />

	<SiteFooter features={true} />
</div>
