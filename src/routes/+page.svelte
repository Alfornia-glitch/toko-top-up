<script lang="ts">
	import { onMount } from 'svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import CustomerServiceButton from '#lib/frontend/components/CustomerServiceButton.svelte';
	import StorefrontLiveSection from '#lib/frontend/components/storefront/StorefrontLiveSection.svelte';
	import DealsSection from '#lib/frontend/modules/landing/components/DealsSection.svelte';
	import BrandsSection from '#lib/frontend/modules/landing/components/BrandsSection.svelte';
	import NewArrivalsSection from '#lib/frontend/modules/landing/components/NewArrivalsSection.svelte';
	import CtaBanner from '#lib/frontend/modules/landing/components/CtaBanner.svelte';
	import PopularProductsSection from '#lib/frontend/modules/landing/components/PopularProductsSection.svelte';
	import RegularHeroSection from '#lib/frontend/modules/landing/components/regular/HeroSection.svelte';
	import RegularCategorySection from '#lib/frontend/modules/landing/components/regular/CategorySection.svelte';
	import RegularTestimonialsSection from '#lib/frontend/modules/landing/components/regular/TestimonialsSection.svelte';
	import TopupHeroSection from '#lib/frontend/modules/landing/components/topup/HeroSection.svelte';
	import TopupCategorySection from '#lib/frontend/modules/landing/components/topup/CategorySection.svelte';
	import TopupTestimonialsSection from '#lib/frontend/modules/landing/components/topup/TestimonialsSection.svelte';

	const isTopup = $derived(site.storefrontLayout === 'topup');

	onMount(() => {
		void home.ensure();
		void site.ensure();
	});
</script>

{#if isTopup}
	<div
		class="shopix-page relative flex min-h-screen w-full flex-col items-center bg-background text-foreground"
		data-name="Top up - Home page"
	>
		<SiteHeader />
		<TopupHeroSection />
		<TopupCategorySection />
		<TopupTestimonialsSection />
		<SiteFooter />
		<CustomerServiceButton />
	</div>
{:else}
	<div
		class="shopix-page relative flex min-h-screen w-full flex-col content-stretch items-center bg-white"
		data-name="Shopix - Home page"
	>
		<SiteHeader announcementCount={2} />
		<RegularHeroSection />
		<RegularCategorySection />
		<StorefrontLiveSection />
		<DealsSection />
		<BrandsSection />
		<NewArrivalsSection />
		<CtaBanner />
		<PopularProductsSection />
		<RegularTestimonialsSection />

		<SiteFooter features={true} />
	</div>
{/if}
