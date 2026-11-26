<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { syncDocumentLang } from '#lib/frontend/i18n/locale.ts';
	import Seo from '#lib/frontend/components/Seo.svelte';
	import { DYNAMIC_SEO_ROUTES, metaForRoute } from '#lib/frontend/modules/seo/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { onMount } from 'svelte';

	let { children } = $props();

	syncDocumentLang();

	onMount(() => {
		void site.ensure();
	});

	if (import.meta.env.DEV) {
		window.addEventListener(
			'click',
			(e) => {
				const target = e.target as Element | null;
				if (!target?.closest?.('#svelte-inspector-toggle')) return;
				e.preventDefault();
				e.stopImmediatePropagation();
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', altKey: true, bubbles: true })
				);
			},
			true
		);
	}
</script>

<svelte:head><link rel="icon" href={site.logoUrl || favicon} /></svelte:head>

{#if !DYNAMIC_SEO_ROUTES.has(page.route.id ?? '')}
	<Seo meta={metaForRoute(page.route.id, site.storeName)} />
{/if}

<div class="commerce-app min-h-screen w-full">
	{@render children()}
</div>
