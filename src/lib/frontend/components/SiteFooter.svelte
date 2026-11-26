<script lang="ts">
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import RegularSiteFooter from './layouts/regular/SiteFooter.svelte';
	import TopupSiteFooter from './layouts/topup/SiteFooter.svelte';

	let { features = false }: { features?: boolean } = $props();
</script>

{#if site.storefrontLayout === 'topup'}
	<TopupSiteFooter />
{:else}
	<RegularSiteFooter {features} />
{/if}
