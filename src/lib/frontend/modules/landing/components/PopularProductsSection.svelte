<script lang="ts">
	import ProductCarousel from '#lib/frontend/components/storefront/ProductCarousel.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
</script>

<ProductCarousel
	title="Popular Products"
	products={home.popular}
	viewAllHref="/products?sort=popular"
	emptyLabel="No popular products yet."
/>
