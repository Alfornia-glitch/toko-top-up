<script lang="ts">
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import RegularSiteHeader from './layouts/regular/SiteHeader.svelte';
	import TopupSiteHeader from './layouts/topup/SiteHeader.svelte';

	let { announcementCount = 6 }: { announcementCount?: number } = $props();
</script>

{#if site.storefrontLayout === 'topup'}
	<TopupSiteHeader />
{:else}
	<RegularSiteHeader {announcementCount} />
{/if}
