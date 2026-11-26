<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ProductCarousel from '#lib/frontend/components/storefront/ProductCarousel.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
</script>

<ProductCarousel
	title={m.components_landing_new_arrivals_title()}
	products={home.newArrivals}
	viewAllHref="/products?newArrival=true"
	emptyLabel={m.components_landing_new_arrivals_empty()}
/>
