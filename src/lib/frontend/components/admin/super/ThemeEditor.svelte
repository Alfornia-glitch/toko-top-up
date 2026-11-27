<script lang="ts">
	import { onMount } from 'svelte';
	import { RotateCcw, Star } from '@lucide/svelte';
	import { parse, wcagContrast } from 'culori';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { ColorPicker } from '#lib/frontend/components/ui/color-picker/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import {
		DEFAULT_RADIUS,
		THEME_GROUPS,
		THEME_MODES,
		THEME_TOKENS,
		isThemeColor,
		sanitizeTheme,
		themeColor,
		type Theme,
		type ThemeGroup,
		type ThemeMode,
		type ThemeToken
	} from '#shared/theme.ts';
	import { THEME_PRESETS, type ThemePresetName } from '#shared/theme-presets.ts';

	type Scheme = 'light' | 'dark';

	let draft = $state<Theme>(sanitizeTheme(null));
	let saved = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let notice = $state('');
	let tab = $state<Scheme | 'general'>('light');

	const dirty = $derived(JSON.stringify(draft) !== saved);
	const previewScheme = $derived<Scheme>(tab === 'dark' ? 'dark' : 'light');
	/** Every token resolved for the previewed scheme, so the preview ignores the page's own theme. */
	const previewStyle = $derived(
		THEME_TOKENS.map(
			(token) => `--${token.key}:${themeColor(draft, previewScheme, token.key)}`
		).join(';') + `;--radius:${draft.radius}`
	);
	const radiusRem = $derived(Number.parseFloat(draft.radius) || 0);

	const groupLabels: Record<ThemeGroup, () => string> = {
		surface: () => m.admin_super_theme_group_surface(),
		text: () => m.admin_super_theme_group_text(),
		brand: () => m.admin_super_theme_group_brand(),
		status: () => m.admin_super_theme_group_status(),
		line: () => m.admin_super_theme_group_line(),
		sidebar: () => m.admin_super_theme_group_sidebar()
	};
	const modeLabels: Record<ThemeMode, () => string> = {
		light: () => m.admin_super_theme_mode_light(),
		dark: () => m.admin_super_theme_mode_dark(),
		system: () => m.admin_super_theme_mode_system()
	};
	const presetLabels: Record<ThemePresetName, () => string> = {
		default: () => m.admin_super_theme_preset_default(),
		blue: () => m.admin_super_theme_preset_blue(),
		warm: () => m.admin_super_theme_preset_warm()
	};

	const groups = THEME_GROUPS.map((group) => ({
		group,
		tokens: THEME_TOKENS.filter((token) => token.group === group)
	}));

	function setColor(scheme: Scheme, token: ThemeToken, value: string) {
		if (isThemeColor(value)) draft[scheme][token] = value.trim();
	}

	function resetColor(scheme: Scheme, token: ThemeToken) {
		delete draft[scheme][token];
	}

	function contrast(scheme: Scheme, token: ThemeToken, partner: string): number | null {
		const a = parse(themeColor(draft, scheme, token));
		const b = parse(themeColor(draft, scheme, partner as ThemeToken));
		return a && b ? wcagContrast(a, b) : null;
	}

	function applyPreset(name: ThemePresetName) {
		draft = sanitizeTheme({ ...THEME_PRESETS[name], mode: draft.mode });
		notice = '';
	}

	function apply(theme: Theme) {
		draft = sanitizeTheme(theme);
		saved = JSON.stringify(draft);
	}

	async function load() {
		loading = true;
		error = '';

		try {
			await site.load();
			apply(site.theme);
		} catch (cause) {
			error = errorMessage(cause, 'admin_super_theme_load_failed');
		} finally {
			loading = false;
		}
	}

	async function save() {
		error = '';
		notice = '';
		saving = true;

		try {
			const response = await fetch('/api/admin/super/theme', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(draft)
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw body;

			await load();
			notice = m.admin_super_theme_saved();
		} catch (cause) {
			error = errorMessage(cause, 'admin_super_theme_save_failed');
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<section class="space-y-4" aria-label={m.admin_super_theme_title()}>
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-sm text-muted-foreground">{m.admin_super_theme_presets()}</span>
			{#each Object.keys(THEME_PRESETS) as name (name)}
				<Button
					variant="outline"
					size="sm"
					disabled={loading || saving}
					onclick={() => applyPreset(name as ThemePresetName)}
				>
					{presetLabels[name as ThemePresetName]()}
				</Button>
			{/each}
		</div>
		<div class="flex items-center gap-2">
			<Button variant="ghost" disabled={loading || saving} onclick={() => applyPreset('default')}>
				<RotateCcw class="size-4" />
				{m.admin_super_theme_reset_all()}
			</Button>
			<Button onclick={save} disabled={loading || saving || !dirty}>
				{saving ? m.common_saving() : m.admin_super_theme_save()}
			</Button>
		</div>
	</div>

	{#if error}
		<div
			class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			{error}
		</div>
	{/if}
	{#if notice}
		<div
			class="rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success"
			role="status"
		>
			{notice}
		</div>
	{/if}

	{#if loading}
		<Skeleton class="h-80 w-full rounded-lg" />
	{:else}
		<div class="space-y-6">
			<aside aria-label={m.admin_super_theme_preview()}>
				<p class="mb-2 text-sm font-medium">{m.admin_super_theme_preview()}</p>
				<div
					class="space-y-4 rounded-xl border bg-background p-4 text-foreground {previewScheme ===
					'dark'
						? 'dark'
						: ''}"
					style={previewStyle}
				>
					<Card.Root>
						<Card.Header>
							<Card.Title>{m.admin_super_theme_preview_card_title()}</Card.Title>
							<Card.Description>{m.admin_super_theme_preview_card_text()}</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3">
							<div class="flex items-center gap-0.5 text-rating">
								{#each [0, 1, 2, 3, 4] as star (star)}
									<Star class="size-4 fill-rating" />
								{/each}
							</div>
							<div class="flex flex-wrap gap-2">
								<Button size="sm">{m.admin_super_theme_preview_primary()}</Button>
								<Button size="sm" variant="secondary"
									>{m.admin_super_theme_preview_secondary()}</Button
								>
								<Button size="sm" variant="outline">{m.admin_super_theme_preview_outline()}</Button>
								<Button size="sm" variant="destructive">
									{m.admin_super_theme_preview_destructive()}
								</Button>
							</div>
							<Input placeholder={m.admin_super_theme_preview_input()} />
							<div class="flex flex-wrap gap-2">
								<Badge variant="success">{m.admin_super_theme_preview_paid()}</Badge>
								<Badge variant="warning">{m.admin_super_theme_preview_pending()}</Badge>
								<Badge variant="destructive">{m.admin_super_theme_preview_failed()}</Badge>
							</div>
						</Card.Content>
					</Card.Root>
					<p class="text-sm text-muted-foreground">{m.admin_super_theme_preview_card_text()}</p>
				</div>
			</aside>

			<Tabs.Root bind:value={tab}>
				<Tabs.List>
					<Tabs.Trigger value="light">{m.admin_super_theme_tab_light()}</Tabs.Trigger>
					<Tabs.Trigger value="dark">{m.admin_super_theme_tab_dark()}</Tabs.Trigger>
					<Tabs.Trigger value="general">{m.admin_super_theme_tab_general()}</Tabs.Trigger>
				</Tabs.List>

				{#each ['light', 'dark'] as const as scheme (scheme)}
					<Tabs.Content value={scheme} class="space-y-6 pt-4">
						{#each groups as { group, tokens } (group)}
							<div class="space-y-2">
								<h2 class="text-sm font-medium">{groupLabels[group]()}</h2>
								<div class="divide-y rounded-lg border">
									{#each tokens as token (token.key)}
										{@const value = themeColor(draft, scheme, token.key)}
										{@const overridden = token.key in draft[scheme]}
										{@const partner = 'pairedWith' in token ? token.pairedWith : null}
										{@const ratio = partner ? contrast(scheme, token.key, partner) : null}
										<div class="flex flex-wrap items-center gap-3 p-2.5">
											<ColorPicker
												{value}
												ariaLabel={m.admin_super_theme_pick_aria({ token: token.key })}
												onchange={(color) => setColor(scheme, token.key, color)}
											/>
											<code class="min-w-40 flex-1 text-xs">{token.key}</code>
											{#if ratio !== null}
												<Badge variant={ratio >= 4.5 ? 'success' : 'warning'}>
													{ratio >= 4.5
														? m.admin_super_theme_contrast_ok({ ratio: ratio.toFixed(1) })
														: m.admin_super_theme_contrast_low({ ratio: ratio.toFixed(1) })}
												</Badge>
											{/if}
											<Input
												class="h-8 w-56 font-mono text-xs"
												{value}
												spellcheck="false"
												maxlength={80}
												aria-label={token.key}
												oninput={(event) => setColor(scheme, token.key, event.currentTarget.value)}
											/>
											<Button
												variant="ghost"
												size="icon-sm"
												disabled={!overridden}
												aria-label={m.admin_super_theme_reset_token({ token: token.key })}
												onclick={() => resetColor(scheme, token.key)}
											>
												<RotateCcw class="size-4" />
											</Button>
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</Tabs.Content>
				{/each}

				<Tabs.Content value="general" class="space-y-6 pt-4">
					<div class="space-y-2">
						<label class="text-sm font-medium" for="theme-mode">{m.admin_super_theme_mode()}</label>
						<Select.Root
							type="single"
							value={draft.mode}
							onValueChange={(value) => (draft.mode = value as ThemeMode)}
						>
							<Select.Trigger id="theme-mode" class="w-64">
								{modeLabels[draft.mode]()}
							</Select.Trigger>
							<Select.Content>
								{#each THEME_MODES as mode (mode)}
									<Select.Item value={mode} label={modeLabels[mode]()}>
										{modeLabels[mode]()}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<p class="text-xs text-muted-foreground">{m.admin_super_theme_mode_hint()}</p>
					</div>

					<div class="space-y-2">
						<label class="text-sm font-medium" for="theme-radius">
							{m.admin_super_theme_radius()}
							<span class="ml-2 font-mono text-xs text-muted-foreground">{draft.radius}</span>
						</label>
						<input
							id="theme-radius"
							type="range"
							min="0"
							max="1.5"
							step="0.125"
							class="block w-64 accent-primary"
							value={radiusRem}
							oninput={(event) =>
								(draft.radius =
									Number(event.currentTarget.value) === Number.parseFloat(DEFAULT_RADIUS)
										? DEFAULT_RADIUS
										: `${event.currentTarget.value}rem`)}
						/>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	{/if}
</section>
