<script lang="ts" module>
	export type ProductVariantRow = {
		clientId: string;
		id?: string;
		sku: string;
		name: string;
		price: string;
		compareAtPrice: string;
		stock: string;
		weightGrams: string;
		status: 'active' | 'inactive';
		optionValuesJson: Record<string, string>;
	};
</script>

<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Plus, Trash2 } from '@lucide/svelte';
	import type { ProductOptionRow } from '#lib/frontend/components/admin/catalog/ProductOptionsEditor.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';

	let {
		variants = $bindable(),
		options = []
	}: { variants: ProductVariantRow[]; options?: ProductOptionRow[] } = $props();

	function addVariant() {
		variants.push({
			clientId: crypto.randomUUID(),
			sku: '',
			name: '',
			price: '',
			compareAtPrice: '',
			stock: '0',
			weightGrams: '',
			status: 'active',
			optionValuesJson: Object.fromEntries(
				options
					.map((option) => ({
						name: option.name.trim(),
						value: option.values.find((entry) => entry.value.trim())?.value ?? ''
					}))
					.filter((entry) => Boolean(entry.name))
					.map((entry) => [entry.name, entry.value] as const)
			)
		});
	}

	function removeVariant(index: number) {
		variants.splice(index, 1);
	}

	function setOptionValue(variant: ProductVariantRow, optionName: string, value: string) {
		variant.optionValuesJson[optionName] = value;
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<h3 class="font-medium">{m.components_variants_title()}</h3>
			<p class="text-sm text-muted-foreground">
				{m.components_variants_description()}
			</p>
		</div>
		<Button type="button" variant="outline" onclick={addVariant}>
			<Plus class="size-4" />
			{m.components_variants_add()}
		</Button>
	</div>

	{#if variants.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
			{m.components_variants_empty()}
		</div>
	{:else}
		<div class="space-y-3">
			{#each variants as variant, index (variant.clientId)}
				<div class="space-y-3 rounded-lg border p-4">
					<div class="flex items-center justify-between gap-2">
						<p class="truncate font-medium">{variant.name || m.components_variants_new()}</p>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							class="text-destructive hover:bg-destructive/10"
							aria-label={m.components_variants_remove()}
							onclick={() => removeVariant(index)}
						>
							<Trash2 class="size-4" />
						</Button>
					</div>

					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<label class="grid gap-1 text-xs font-medium text-muted-foreground">
							{m.components_form_sku()}
							<Input
								bind:value={variant.sku}
								placeholder={m.components_form_sku()}
								aria-label={m.components_variants_sku_label()}
							/>
						</label>
						<label class="grid gap-1 text-xs font-medium text-muted-foreground">
							{m.common_name()}
							<Input
								bind:value={variant.name}
								placeholder={m.components_variants_name_placeholder()}
								aria-label={m.components_variants_name_placeholder()}
							/>
						</label>
						<label class="grid gap-1 text-xs font-medium text-muted-foreground">
							{m.common_price()}
							<Input
								type="number"
								min="0"
								step="0.01"
								bind:value={variant.price}
								placeholder="0.00"
								aria-label={m.components_variants_price_label()}
							/>
						</label>
						<label class="grid gap-1 text-xs font-medium text-muted-foreground">
							{m.components_variants_compare_at()}
							<Input
								type="number"
								min="0"
								step="0.01"
								bind:value={variant.compareAtPrice}
								placeholder={m.common_optional()}
								aria-label={m.components_variants_compare_at_label()}
							/>
						</label>
						<label class="grid gap-1 text-xs font-medium text-muted-foreground">
							{m.components_form_stock()}
							{#if variant.id}
								<span
									class="flex h-9 items-center text-sm text-foreground"
									aria-label={m.components_variants_stock_label()}
								>
									{variant.stock}
								</span>
							{:else}
								<Input
									type="number"
									min="0"
									step="1"
									bind:value={variant.stock}
									aria-label={m.components_variants_stock_label()}
								/>
							{/if}
						</label>
						<label class="grid gap-1 text-xs font-medium text-muted-foreground">
							{m.components_variants_weight()}
							<Input
								type="number"
								min="0"
								step="1"
								bind:value={variant.weightGrams}
								placeholder={m.common_optional()}
								aria-label={m.components_variants_weight_label()}
							/>
						</label>
						<div class="grid gap-1 text-xs font-medium text-muted-foreground">
							{m.common_status()}
							<Select.Root
								type="single"
								value={variant.status}
								onValueChange={(value) =>
									(variant.status = value === 'inactive' ? 'inactive' : 'active')}
							>
								<Select.Trigger class="w-full">
									<Select.Value placeholder={m.components_form_select_status()} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="active" label={m.common_active()}
										>{m.common_active()}</Select.Item
									>
									<Select.Item value="inactive" label={m.common_inactive()}
										>{m.common_inactive()}</Select.Item
									>
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					{#if options.length > 0}
						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{#each options as option (option.clientId)}
								<div class="grid gap-1 text-xs font-medium text-muted-foreground">
									{option.name || m.components_variants_option_fallback()}
									<Select.Root
										type="single"
										value={variant.optionValuesJson[option.name] ?? ''}
										onValueChange={(value) => setOptionValue(variant, option.name, value)}
									>
										<Select.Trigger class="w-full">
											<Select.Value
												placeholder={m.components_variants_select_option({
													name: option.name || m.components_variants_value_fallback()
												})}
											/>
										</Select.Trigger>
										<Select.Content>
											{#each option.values.filter( (value) => value.value.trim() ) as value (value.clientId)}
												<Select.Item value={value.value} label={value.value}>
													{value.value}
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
