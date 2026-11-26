<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ProductCarousel from '#lib/frontend/components/storefront/ProductCarousel.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
</script>

<ProductCarousel
	title={m.components_landing_popular_title()}
	products={home.popular}
	viewAllHref="/products?sort=popular"
	emptyLabel={m.components_landing_popular_empty()}
/>
