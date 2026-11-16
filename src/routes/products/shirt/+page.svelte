<script lang="ts">
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import PrototypeProductDetail from '#lib/frontend/components/storefront/PrototypeProductDetail.svelte';
</script>

<div
	class="relative flex size-full flex-col content-stretch items-center bg-white"
	data-name="Shopix - Shirt"
>
	<SiteHeader />
	<PrototypeProductDetail slug="everyday-cotton-shirt" />
	<SiteFooter />
</div>
