<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { FOOTER_LINKS, footerLegal } from '#lib/frontend/content/navigation.topup.ts';

	onMount(() => {
		void site.ensure();
	});
</script>

<footer class="mt-16 w-full border-t bg-background" data-name="Footer">
	<div class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground">
		<nav class="flex flex-wrap gap-x-6 gap-y-2" aria-label={m.components_footer_label()}>
			{#each FOOTER_LINKS as link (link.href)}
				<a href={link.href} class="hover:text-foreground hover:underline">{link.label}</a>
			{/each}
		</nav>
		{#if site.contact.email}
			<p>{site.contact.email}</p>
		{/if}
		<p class="text-xs">{footerLegal()}</p>
	</div>
</footer>
