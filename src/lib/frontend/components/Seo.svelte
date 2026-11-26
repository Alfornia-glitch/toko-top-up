<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { jsonLdText, metaTags, type PageMeta } from '#lib/frontend/modules/seo/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';

	let { meta }: { meta: PageMeta } = $props();

	const url = $derived(`${page.url.origin}${page.url.pathname}`);
	const tags = $derived(metaTags(meta, url, page.url.origin, site.storeName));
	const jsonLd = $derived(
		meta.jsonLd ? `<script type="application/ld+json">${jsonLdText(meta.jsonLd)}</` + 'script>' : ''
	);

	// The shell arrives with server-injected tags; replace them so client navigation stays accurate.
	onMount(() => {
		for (const node of document.head.querySelectorAll('[data-seo="ssr"]')) node.remove();
	});
</script>

<svelte:head>
	<title>{meta.title}</title>
	<link rel="canonical" href={url} />
	{#each tags as tag (tag.key)}
		{#if tag.kind === 'name'}
			<meta name={tag.key} content={tag.content} />
		{:else}
			<meta property={tag.key} content={tag.content} />
		{/if}
	{/each}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- jsonLdText escapes `<` -->
	{@html jsonLd}
</svelte:head>
