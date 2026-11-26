<script lang="ts" module>
	export type CouponRecord = {
		id: string;
		code: string;
		type: 'percentage' | 'fixed';
		value: number;
		minSubtotal: number;
		maxUses: number | null;
		usedCount: number;
		startsAt: string | null;
		endsAt: string | null;
		status: string;
		appliesToJson: Record<string, unknown> | null;
		createdAt: string;
		updatedAt: string;
	};
</script>

<script lang="ts">
	import * as Dialog from '#lib/frontend/components/ui/dialog/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Switch } from '#lib/frontend/components/ui/switch/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';

	let {
		open = $bindable(false),
		coupon = null,
		onsaved
	}: {
		open?: boolean;
		coupon?: CouponRecord | null;
		onsaved?: () => void | Promise<void>;
	} = $props();

	function toDatetimeLocal(value: string | null) {
		if (!value) return '';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		const pad = (input: number) => String(input).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	function fromDatetimeLocal(value: string) {
		return value ? new Date(value).toISOString() : null;
	}

	function text(value: unknown) {
		return value === null || value === undefined ? '' : String(value);
	}

	function initialForm() {
		const value = coupon;

		return {
			code: value?.code ?? '',
			type: value?.type ?? 'percentage',
			value: value?.type === 'fixed' ? String(value.value) : String(value?.value ?? ''),
			minSubtotal: value ? String(value.minSubtotal) : '0',
			maxUses: value?.maxUses ? String(value.maxUses) : '',
			startsAt: toDatetimeLocal(value?.startsAt ?? null),
			endsAt: toDatetimeLocal(value?.endsAt ?? null),
			active: (value?.status ?? 'active') === 'active',
			appliesToJson: value?.appliesToJson ? JSON.stringify(value.appliesToJson, null, 2) : ''
		};
	}

	const initial = initialForm();
	let code = $state(initial.code);
	let type = $state<'percentage' | 'fixed'>(initial.type);
	let value = $state(initial.value);
	let minSubtotal = $state(initial.minSubtotal);
	let maxUses = $state(initial.maxUses);
	let startsAt = $state(initial.startsAt);
	let endsAt = $state(initial.endsAt);
	let active = $state(initial.active);
	let appliesToJson = $state(initial.appliesToJson);
	let saving = $state(false);
	let error = $state('');

	const valueLabel = $derived(type === 'fixed' ? 'Value (rupiah off)' : 'Value (percentage off)');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		const trimmedCode = code.trim();
		if (trimmedCode.length < 2) {
			error = 'Code must be at least 2 characters.';
			return;
		}

		const numericValue = Number(value);
		if (!Number.isFinite(numericValue) || numericValue <= 0) {
			error = 'Value must be greater than zero.';
			return;
		}

		const numericMinSubtotal = Number(minSubtotal);
		if (!Number.isFinite(numericMinSubtotal) || numericMinSubtotal < 0) {
			error = 'Minimum subtotal must be zero or more.';
			return;
		}

		let parsedMaxUses: number | null = null;
		const maxUsesText = text(maxUses);
		if (maxUsesText) {
			const numericMaxUses = Number(maxUsesText);
			if (!Number.isInteger(numericMaxUses) || numericMaxUses < 1) {
				error = 'Max uses must be a positive whole number.';
				return;
			}
			parsedMaxUses = numericMaxUses;
		}

		let parsedAppliesTo: Record<string, unknown> | null = null;
		if (appliesToJson.trim()) {
			try {
				const parsed = JSON.parse(appliesToJson);
				if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
					throw new Error('Invalid JSON');
				}
				parsedAppliesTo = parsed as Record<string, unknown>;
			} catch {
				error = 'Applies to must be a valid JSON object.';
				return;
			}
		}

		const payload = {
			code: trimmedCode,
			type,
			value: Math.round(numericValue),
			minSubtotal: Math.round(numericMinSubtotal),
			maxUses: parsedMaxUses,
			startsAt: fromDatetimeLocal(startsAt),
			endsAt: fromDatetimeLocal(endsAt),
			status: active ? 'active' : 'disabled',
			appliesToJson: parsedAppliesTo
		};

		saving = true;

		try {
			const endpoint = coupon ? `/api/admin/coupons/${coupon.id}` : '/api/admin/coupons';
			const response = await fetch(endpoint, {
				method: coupon ? 'PATCH' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(result.error ?? 'Could not save coupon');

			open = false;
			await onsaved?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save coupon';
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>{coupon ? 'Edit coupon' : 'New coupon'}</Dialog.Title>
			<Dialog.Description>
				{coupon
					? 'Update discount rules, limits and the active window.'
					: 'Create a discount code for the storefront.'}
			</Dialog.Description>
		</Dialog.Header>

		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="coupon-code">Code</Field.Label>
						<Input id="coupon-code" bind:value={code} placeholder="e.g. SPRING20" required />
					</Field.Field>

					<Field.Field>
						<Field.Label for="coupon-type">Type</Field.Label>
						<Select.Root
							type="single"
							value={type}
							onValueChange={(value) => (type = value as 'percentage' | 'fixed')}
						>
							<Select.Trigger id="coupon-type" class="w-full">
								<Select.Value placeholder="Select type" />
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="percentage" label="Percentage">Percentage</Select.Item>
								<Select.Item value="fixed" label="Fixed amount">Fixed amount</Select.Item>
							</Select.Content>
						</Select.Root>
					</Field.Field>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="coupon-value">{valueLabel}</Field.Label>
						<Input id="coupon-value" type="number" min="0" step="0.01" bind:value required />
						<Field.Description>
							{type === 'fixed'
								? 'Amount in rupiah.'
								: 'Whole percentage, for example 20 for 20% off.'}
						</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="coupon-min-subtotal">Minimum subtotal (rupiah)</Field.Label>
						<Input
							id="coupon-min-subtotal"
							type="number"
							min="0"
							step="0.01"
							bind:value={minSubtotal}
						/>
						<Field.Description>Whole rupiah.</Field.Description>
					</Field.Field>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="coupon-max-uses">Max uses</Field.Label>
						<Input
							id="coupon-max-uses"
							type="number"
							min="1"
							step="1"
							bind:value={maxUses}
							placeholder="Unlimited"
						/>
						<Field.Description>Leave empty for unlimited redemptions.</Field.Description>
					</Field.Field>

					<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
						<div>
							<p class="text-sm font-medium">Active</p>
							<p class="text-xs text-muted-foreground">Disabled coupons cannot be redeemed.</p>
						</div>
						<Switch bind:checked={active} aria-label="Coupon active" />
					</div>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Field.Label for="coupon-starts-at">Starts at</Field.Label>
						<Input id="coupon-starts-at" type="datetime-local" bind:value={startsAt} />
						<Field.Description>Leave empty to start immediately.</Field.Description>
					</Field.Field>

					<Field.Field>
						<Field.Label for="coupon-ends-at">Ends at</Field.Label>
						<Input id="coupon-ends-at" type="datetime-local" bind:value={endsAt} />
						<Field.Description>Leave empty for no expiry.</Field.Description>
					</Field.Field>
				</div>

				<Field.Field>
					<Field.Label for="coupon-applies-to">Applies to JSON</Field.Label>
					<Textarea
						id="coupon-applies-to"
						bind:value={appliesToJson}
						placeholder={`{ "categories": ["shoes"] }`}
						rows={4}
					/>
					<Field.Description>
						Optional JSON object limiting which products or categories the coupon applies to.
					</Field.Description>
				</Field.Field>
			</Field.Group>

			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={saving}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving…' : coupon ? 'Save changes' : 'Create coupon'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
