<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { cn } from '#lib/frontend/utils.ts';
	import { APP_LOCALES, currentLocale, switchLocale } from '#lib/frontend/i18n/locale.ts';

	let { class: className }: { class?: string } = $props();

	const active = currentLocale();

	const names = {
		id: () => m.common_language_id(),
		en: () => m.common_language_en()
	} as const;
</script>

<div
	role="group"
	aria-label={m.common_language_switch_label()}
	class={cn('inline-flex items-center rounded-md border p-0.5 text-xs font-medium', className)}
>
	{#each APP_LOCALES as locale (locale)}
		<button
			type="button"
			lang={locale}
			title={names[locale]()}
			aria-label={names[locale]()}
			aria-pressed={locale === active}
			onclick={() => switchLocale(locale)}
			class={cn(
				'cursor-pointer rounded px-2 py-1 uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
				locale === active
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:bg-accent hover:text-foreground'
			)}
		>
			{locale}
		</button>
	{/each}
</div>
