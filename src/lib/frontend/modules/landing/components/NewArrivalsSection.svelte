<script lang="ts">
	import ProductCarousel from '#lib/frontend/components/storefront/ProductCarousel.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
</script>

<ProductCarousel
	title="New Arrival Products"
	products={home.newArrivals}
	viewAllHref="/products?newArrival=true"
	emptyLabel="No new arrivals yet."
/>
