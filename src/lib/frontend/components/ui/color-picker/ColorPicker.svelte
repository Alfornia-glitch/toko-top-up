<script lang="ts">
	import { untrack } from 'svelte';
	import { parse } from 'culori';
	import * as Popover from '#lib/frontend/components/ui/popover/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { cn } from '#lib/frontend/utils.ts';
	import {
		COLOR_FORMATS,
		detectFormat,
		formatColor,
		toHslChannels,
		toHsva,
		toOklchChannels,
		toRgbChannels,
		type ColorFormat,
		type Hsva
	} from './color.ts';

	type Props = {
		value: string;
		onchange: (value: string) => void;
		ariaLabel: string;
		class?: string;
	};

	let { value, onchange, ariaLabel, class: className }: Props = $props();

	const CHECKERBOARD =
		'conic-gradient(#d4d4d8 25%, #fff 0 50%, #d4d4d8 0 75%, #fff 0) 0 0 / 8px 8px';

	let hsva = $state<Hsva>(untrack(() => toHsva(value)));
	let format = $state<ColorFormat>(untrack(() => detectFormat(value)));
	let lastEmitted = untrack(() => value);
	let frame = 0;

	// Re-sync when the value is changed from outside (text field, preset, reset).
	$effect(() => {
		if (value === lastEmitted) return;
		lastEmitted = value;
		hsva = toHsva(value, hsva);
		format = detectFormat(value);
	});

	const output = $derived(formatColor(hsva, format));
	const rgb = $derived(toRgbChannels(hsva));
	const opaque = $derived(`rgb(${rgb.r} ${rgb.g} ${rgb.b})`);

	const fields = $derived.by(() => {
		if (format === 'rgb') {
			return [
				{ label: 'R', value: rgb.r, min: 0, max: 255, step: 1 },
				{ label: 'G', value: rgb.g, min: 0, max: 255, step: 1 },
				{ label: 'B', value: rgb.b, min: 0, max: 255, step: 1 }
			];
		}
		if (format === 'hsl') {
			const hsl = toHslChannels(hsva);
			return [
				{ label: 'H', value: Math.round(hsl.h), min: 0, max: 360, step: 1 },
				{ label: 'S', value: Math.round(hsl.s), min: 0, max: 100, step: 1 },
				{ label: 'L', value: Math.round(hsl.l), min: 0, max: 100, step: 1 }
			];
		}
		if (format === 'oklch') {
			const oklch = toOklchChannels(hsva);
			return [
				{ label: 'L', value: Number(oklch.l.toFixed(3)), min: 0, max: 1, step: 0.01 },
				{ label: 'C', value: Number(oklch.c.toFixed(3)), min: 0, max: 0.4, step: 0.01 },
				{ label: 'H', value: Math.round(oklch.h), min: 0, max: 360, step: 1 }
			];
		}
		return [];
	});

	const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

	/** Writes to the parent at most once per frame while dragging. */
	function emit() {
		lastEmitted = formatColor(hsva, format);
		if (frame) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			onchange(lastEmitted);
		});
	}

	function update(next: Partial<Hsva>) {
		hsva = { ...hsva, ...next };
		emit();
	}

	function setFormat(next: ColorFormat) {
		format = next;
		emit();
	}

	/** Applies a colour string typed into a field; ignores anything that does not parse. */
	function applyText(text: string) {
		const parsed = parse(text);
		if (!parsed) return;
		hsva = toHsva(parsed, hsva);
		emit();
	}

	function setChannel(index: number, raw: string) {
		const field = fields[index];
		const n = Number(raw);
		if (!field || raw.trim() === '' || Number.isNaN(n)) return;

		const next = fields.map((f, i) => (i === index ? clamp(n, field.min, field.max) : f.value));
		const alpha = hsva.a < 1 ? ` / ${Number(hsva.a.toFixed(2))}` : '';
		if (format === 'rgb') applyText(`rgb(${next[0]} ${next[1]} ${next[2]}${alpha})`);
		else if (format === 'hsl') applyText(`hsl(${next[0]} ${next[1]}% ${next[2]}%${alpha})`);
		else applyText(`oklch(${next[0]} ${next[1]} ${next[2]}${alpha})`);
	}

	function drag(node: HTMLElement, onmove: (x: number, y: number) => void) {
		const move = (event: PointerEvent) => {
			const rect = node.getBoundingClientRect();
			onmove(
				clamp((event.clientX - rect.left) / rect.width, 0, 1),
				clamp((event.clientY - rect.top) / rect.height, 0, 1)
			);
		};
		const down = (event: PointerEvent) => {
			node.setPointerCapture(event.pointerId);
			node.focus();
			move(event);
			node.addEventListener('pointermove', move);
		};
		const up = (event: PointerEvent) => {
			node.releasePointerCapture(event.pointerId);
			node.removeEventListener('pointermove', move);
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);

		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('pointermove', move);
		};
	}

	function step(event: KeyboardEvent): [number, number] {
		const size = event.shiftKey ? 0.1 : 0.01;
		const dx = event.key === 'ArrowRight' ? size : event.key === 'ArrowLeft' ? -size : 0;
		const dy = event.key === 'ArrowDown' ? size : event.key === 'ArrowUp' ? -size : 0;
		if (dx || dy) event.preventDefault();
		return [dx, dy];
	}

	function areaKey(event: KeyboardEvent) {
		const [dx, dy] = step(event);
		if (!dx && !dy) return;
		update({ s: clamp(hsva.s + dx, 0, 1), v: clamp(hsva.v - dy, 0, 1) });
	}

	function hueKey(event: KeyboardEvent) {
		const [dx, dy] = step(event);
		if (dx || dy) update({ h: clamp(hsva.h + (dx - dy) * 360, 0, 360) });
	}

	function alphaKey(event: KeyboardEvent) {
		const [dx, dy] = step(event);
		if (dx || dy) update({ a: clamp(hsva.a + dx - dy, 0, 1) });
	}
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			'relative size-8 shrink-0 cursor-pointer overflow-hidden rounded border focus-visible:ring-2 focus-visible:ring-ring',
			className
		)}
		style="background: {CHECKERBOARD}"
		aria-label={ariaLabel}
	>
		<span class="absolute inset-0" style="background: {value}"></span>
	</Popover.Trigger>

	<Popover.Content class="w-64 gap-3" align="start">
		<div
			class="relative h-36 w-full cursor-crosshair touch-none rounded-md"
			style="background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl({hsva.h} 100% 50%))"
			role="slider"
			tabindex="0"
			aria-label={ariaLabel}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(hsva.s * 100)}
			aria-valuetext={output}
			onkeydown={areaKey}
			{@attach (node) => drag(node, (x, y) => update({ s: x, v: 1 - y }))}
		>
			<span
				class="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40"
				style="left: {hsva.s * 100}%; top: {(1 - hsva.v) * 100}%; background: {opaque}"
			></span>
		</div>

		<div
			class="relative h-3 w-full cursor-pointer touch-none rounded-full"
			style="background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
			role="slider"
			tabindex="0"
			aria-label={m.admin_super_theme_picker_hue()}
			aria-valuemin={0}
			aria-valuemax={360}
			aria-valuenow={Math.round(hsva.h)}
			onkeydown={hueKey}
			{@attach (node) => drag(node, (x) => update({ h: x * 360 }))}
		>
			<span
				class="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40"
				style="left: {(hsva.h / 360) * 100}%"
			></span>
		</div>

		<div
			class="relative h-3 w-full cursor-pointer touch-none rounded-full"
			style="background: linear-gradient(to right, transparent, {opaque}), {CHECKERBOARD}"
			role="slider"
			tabindex="0"
			aria-label={m.admin_super_theme_picker_alpha()}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(hsva.a * 100)}
			onkeydown={alphaKey}
			{@attach (node) => drag(node, (x) => update({ a: x }))}
		>
			<span
				class="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40"
				style="left: {hsva.a * 100}%"
			></span>
		</div>

		<div class="grid grid-cols-4 gap-1" role="group" aria-label={m.admin_super_theme_picker_format()}>
			{#each COLOR_FORMATS as option (option)}
				<button
					type="button"
					class={cn(
						'h-7 rounded-md text-xs font-medium uppercase transition-colors',
						format === option ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
					)}
					aria-pressed={format === option}
					onclick={() => setFormat(option)}
				>
					{option}
				</button>
			{/each}
		</div>

		<div class="flex gap-1.5">
			{#if format === 'hex'}
				{#key output}
					<Input
						class="h-8 flex-1 font-mono text-xs"
						value={output}
						spellcheck="false"
						maxlength={9}
						aria-label="HEX"
						onchange={(event) => applyText(event.currentTarget.value)}
					/>
				{/key}
			{:else}
				{#each fields as field, index (field.label)}
					{#key field.value}
						<label class="flex-1 space-y-0.5 text-center text-[10px] text-muted-foreground">
							<Input
								class="h-8 px-1 text-center font-mono text-xs"
								type="number"
								value={field.value}
								min={field.min}
								max={field.max}
								step={field.step}
								onchange={(event) => setChannel(index, event.currentTarget.value)}
							/>
							{field.label}
						</label>
					{/key}
				{/each}
			{/if}
			{#key hsva.a}
				<label class="w-14 space-y-0.5 text-center text-[10px] text-muted-foreground">
					<Input
						class="h-8 px-1 text-center font-mono text-xs"
						type="number"
						value={Math.round(hsva.a * 100)}
						min={0}
						max={100}
						onchange={(event) => {
							const n = Number(event.currentTarget.value);
							if (!Number.isNaN(n)) update({ a: clamp(n, 0, 100) / 100 });
						}}
					/>
					A %
				</label>
			{/key}
		</div>
	</Popover.Content>
</Popover.Root>
