<script lang="ts">
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as DropdownMenu from '#lib/frontend/components/ui/dropdown-menu/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { themePreference } from '#lib/frontend/modules/commerce/theme-preference.svelte.ts';
	import { THEME_MODES, type ThemeMode } from '#shared/theme.ts';

	const labels: Record<ThemeMode, () => string> = {
		light: () => m.common_theme_light(),
		dark: () => m.common_theme_dark(),
		system: () => m.common_theme_system()
	};
	const icons = { light: Sun, dark: Moon, system: Monitor } as const;

	const current = $derived(themePreference.effective(site.theme.mode));
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon" aria-label={m.common_theme_label()}>
				<Sun class="size-4 dark:hidden" />
				<Moon class="hidden size-4 dark:block" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		<DropdownMenu.RadioGroup
			value={current}
			onValueChange={(value) => themePreference.set(value as ThemeMode)}
		>
			{#each THEME_MODES as mode (mode)}
				{@const Icon = icons[mode]}
				<DropdownMenu.RadioItem value={mode}>
					<Icon class="size-4" />
					{labels[mode]()}
				</DropdownMenu.RadioItem>
			{/each}
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
