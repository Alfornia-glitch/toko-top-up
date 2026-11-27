<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import SiteFooter from '#lib/frontend/components/SiteFooter.svelte';
	import SiteHeader from '#lib/frontend/components/SiteHeader.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';

	// SvelteKit's English defaults. They are not shown, the translated copy for the status is used instead.
	const ENGLISH_DEFAULTS = new Set([
		'Not Found',
		'Forbidden',
		'Unauthorized',
		'Internal Error',
		'Bad Request'
	]);

	const copy = $derived.by(() => {
		switch (page.status) {
			case 404:
				return { title: m.storefront_error_title_404(), body: m.storefront_error_body_404() };
			case 401:
				return { title: m.storefront_error_title_401(), body: m.storefront_error_body_401() };
			case 403:
				return { title: m.storefront_error_title_403(), body: m.storefront_error_body_403() };
			case 500:
				return { title: m.storefront_error_title_500(), body: m.storefront_error_body_500() };
			default:
				return {
					title: m.storefront_error_title_generic(),
					body: m.storefront_error_body_generic()
				};
		}
	});

	const detail = $derived.by(() => {
		const message = page.error?.message?.trim();
		return message && !ENGLISH_DEFAULTS.has(message) ? message : '';
	});
</script>

<svelte:head>
	<title>{copy.title}</title>
</svelte:head>

<div class="flex min-h-screen w-full flex-col bg-background">
	<SiteHeader />
	<main class="flex flex-1 items-center justify-center px-4 py-16 sm:px-8">
		<div class="flex max-w-md flex-col items-center gap-4 text-center">
			<p class="text-sm font-medium text-muted-foreground">{page.status}</p>
			<h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{copy.title}</h1>
			<p class="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
			{#if detail}
				<p class="text-xs text-muted-foreground">{detail}</p>
			{/if}
			<Button href="/" class="mt-2">{m.storefront_error_home()}</Button>
		</div>
	</main>
	<SiteFooter />
</div>
