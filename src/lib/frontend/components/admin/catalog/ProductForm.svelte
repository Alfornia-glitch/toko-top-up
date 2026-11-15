<script lang="ts" module>
	export type AdminProductStatus = 'draft' | 'active' | 'archived';

	export type AdminProductImage = {
		id: string;
		url: string;
		path?: string | null;
		alt?: string | null;
		position?: number;
	};

	export type AdminProductOptionValue = {
		id: string;
		value: string;
		colorHex?: string | null;
		position?: number;
	};

	export type AdminProductOption = {
		id: string;
		name: string;
		position?: number;
		values: AdminProductOptionValue[];
	};

	export type AdminProductVariant = {
		id: string;
		sku: string;
		name: string;
		priceCents: number;
		compareAtPriceCents?: number | null;
		stock: number;
		weightGrams?: number | null;
		status: 'active' | 'inactive';
		optionValuesJson?: Record<string, string> | null;
	};

	export type AdminProductDetail = {
		id: string;
		sku: string;
		name: string;
		slug: string;
		description: string | null;
		shortDescription: string | null;
		brandId: string | null;
		categoryId: string | null;
		status: AdminProductStatus;
		priceCents: number;
		compareAtPriceCents: number | null;
		currency: string;
		isFeatured: boolean;
		isNewArrival: boolean;
		isDeal: boolean;
		dealEndsAt: string | null;
		specsJson: Record<string, unknown> | null;
		shippingInfo: string | null;
		returnPolicy: string | null;
		images: AdminProductImage[];
		options: AdminProductOption[];
		variants: AdminProductVariant[];
	};

	export type CatalogCategoryOption = {
		id: string;
		name: string;
		parentName?: string | null;
	};

	export type CatalogBrandOption = {
		id: string;
		name: string;
	};
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { LoaderCircle } from '@lucide/svelte';
	import ProductImagesField from '#lib/frontend/components/admin/catalog/ProductImagesField.svelte';
	import ProductOptionsEditor from '#lib/frontend/components/admin/catalog/ProductOptionsEditor.svelte';
	import ProductStockPanel from '#lib/frontend/components/admin/catalog/ProductStockPanel.svelte';
	import ProductVariantsEditor from '#lib/frontend/components/admin/catalog/ProductVariantsEditor.svelte';
	import type { ProductImageRow } from '#lib/frontend/components/admin/catalog/ProductImagesField.svelte';
	import type { ProductOptionRow } from '#lib/frontend/components/admin/catalog/ProductOptionsEditor.svelte';
	import type { ProductVariantRow } from '#lib/frontend/components/admin/catalog/ProductVariantsEditor.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Switch } from '#lib/frontend/components/ui/switch/index.ts';
	import * as Tabs from '#lib/frontend/components/ui/tabs/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';

	let {
		product = null,
		categories = [],
		brands = []
	}: {
		product?: AdminProductDetail | null;
		categories?: CatalogCategoryOption[];
		brands?: CatalogBrandOption[];
	} = $props();

	const initial = untrack(() => {
		const current = product;

		return {
			name: current?.name ?? '',
			sku: current?.sku ?? '',
			slug: current?.slug ?? '',
			shortDescription: current?.shortDescription ?? '',
			description: current?.description ?? '',
			status: current?.status ?? 'draft',
			brandId: current?.brandId ?? 'none',
			categoryId: current?.categoryId ?? 'none',
			price: current ? centsToInput(current.priceCents) : '',
			compareAtPrice:
				current?.compareAtPriceCents != null ? centsToInput(current.compareAtPriceCents) : '',
			currency: current?.currency ?? 'USD',
			isFeatured: current?.isFeatured ?? false,
			isNewArrival: current?.isNewArrival ?? false,
			isDeal: current?.isDeal ?? false,
			dealEndsAt: toDatetimeLocal(current?.dealEndsAt ?? null),
			shippingInfo: current?.shippingInfo ?? '',
			returnPolicy: current?.returnPolicy ?? '',
			specsJson: current?.specsJson ?? null,
			images: (current?.images ?? []).map((image, index) => ({
				clientId: crypto.randomUUID(),
				id: image.id,
				url: image.url,
				path: image.path ?? null,
				alt: image.alt ?? '',
				position: image.position ?? index
			})) as ProductImageRow[],
			options: (current?.options ?? []).map((option, index) => ({
				clientId: crypto.randomUUID(),
				id: option.id,
				name: option.name,
				position: option.position ?? index,
				values: (option.values ?? []).map((value, valueIndex) => ({
					clientId: crypto.randomUUID(),
					id: value.id,
					value: value.value,
					colorHex: value.colorHex ?? '',
					position: value.position ?? valueIndex
				}))
			})) as ProductOptionRow[],
			variants: (current?.variants ?? []).map((variant) => ({
				clientId: crypto.randomUUID(),
				id: variant.id,
				sku: variant.sku,
				name: variant.name,
				price: centsToInput(variant.priceCents),
				compareAtPrice:
					variant.compareAtPriceCents != null ? centsToInput(variant.compareAtPriceCents) : '',
				stock: String(variant.stock),
				weightGrams: variant.weightGrams != null ? String(variant.weightGrams) : '',
				status: variant.status === 'inactive' ? 'inactive' : 'active',
				optionValuesJson: { ...(variant.optionValuesJson ?? {}) }
			})) as ProductVariantRow[]
		};
	});

	let name = $state(initial.name);
	let sku = $state(initial.sku);
	let slug = $state(initial.slug);
	let shortDescription = $state(initial.shortDescription);
	let description = $state(initial.description);
	let status = $state<string>(initial.status);
	let brandId = $state(initial.brandId);
	let categoryId = $state(initial.categoryId);
	let price = $state(initial.price);
	let compareAtPrice = $state(initial.compareAtPrice);
	let currency = $state(initial.currency);
	let isFeatured = $state(initial.isFeatured);
	let isNewArrival = $state(initial.isNewArrival);
	let isDeal = $state(initial.isDeal);
	let dealEndsAt = $state(initial.dealEndsAt);
	let shippingInfo = $state(initial.shippingInfo);
	let returnPolicy = $state(initial.returnPolicy);
	let specsJson = $state<Record<string, unknown> | null>(initial.specsJson);
	let activeTab = $state('general');

	let images = $state<ProductImageRow[]>(initial.images);
	let options = $state<ProductOptionRow[]>(initial.options);
	let variants = $state<ProductVariantRow[]>(initial.variants);

	let saving = $state(false);
	let error = $state('');

	const editing = $derived(Boolean(product?.id));

	function centsToInput(value: number) {
		return (value / 100).toFixed(2);
	}

	function toCents(value: string) {
		const amount = Number(value);

		return Number.isFinite(amount) && amount >= 0 ? Math.round(Number(value) * 100) : 0;
	}

	function toInt(value: string) {
		const amount = Number(value);

		return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : 0;
	}

	function toDatetimeLocal(value: string | null) {
		if (!value) return '';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		const pad = (part: number) => String(part).padStart(2, '0');

		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
			date.getHours()
		)}:${pad(date.getMinutes())}`;
	}

	function describeError(payload: {
		error?: string;
		details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
	}) {
		const base = payload.error ?? 'Could not save product';
		const messages = [
			...(payload.details?.formErrors ?? []),
			...Object.values(payload.details?.fieldErrors ?? {}).flat()
		];

		return messages.length ? `${base}: ${messages.join(', ')}` : base;
	}

	function buildPayload() {
		const trimmedSlug = slug.trim();

		return {
			name: name.trim(),
			sku: sku.trim(),
			...(trimmedSlug ? { slug: trimmedSlug } : {}),
			description: description.trim() || null,
			shortDescription: shortDescription.trim() || null,
			brandId: brandId === 'none' ? null : brandId,
			categoryId: categoryId === 'none' ? null : categoryId,
			status: status as AdminProductStatus,
			priceCents: toCents(price),
			compareAtPriceCents: compareAtPrice.trim() ? toCents(compareAtPrice) : null,
			currency: currency.trim().toUpperCase() || 'USD',
			isFeatured,
			isNewArrival,
			isDeal,
			dealEndsAt: isDeal && dealEndsAt ? new Date(dealEndsAt).toISOString() : null,
			specsJson,
			shippingInfo: shippingInfo.trim() || null,
			returnPolicy: returnPolicy.trim() || null,
			images: images.map((image, index) => ({
				...(image.id ? { id: image.id } : {}),
				url: image.url,
				path: image.path || null,
				alt: image.alt.trim() || null,
				position: index
			})),
			options: options.map((option, index) => ({
				...(option.id ? { id: option.id } : {}),
				name: option.name.trim(),
				position: index,
				values: option.values.map((value, valueIndex) => ({
					...(value.id ? { id: value.id } : {}),
					value: value.value.trim(),
					colorHex: value.colorHex.trim() || null,
					position: valueIndex
				}))
			})),
			variants: variants.map((variant) => ({
				...(variant.id ? { id: variant.id } : {}),
				sku: variant.sku.trim(),
				name: variant.name.trim(),
				priceCents: toCents(variant.price),
				compareAtPriceCents: variant.compareAtPrice.trim() ? toCents(variant.compareAtPrice) : null,
				stock: toInt(variant.stock),
				weightGrams: variant.weightGrams.trim() ? toInt(variant.weightGrams) : null,
				status: variant.status,
				optionValuesJson: Object.fromEntries(
					options
						.map(
							(option) => [option.name.trim(), variant.optionValuesJson[option.name] ?? ''] as const
						)
						.filter(([key, value]) => Boolean(key) && Boolean(value))
				)
			}))
		};
	}

	function validate() {
		if (!name.trim()) return 'Product name is required.';
		if (!sku.trim()) return 'SKU is required.';
		if (!Number.isFinite(Number(price)) || Number(price) < 0)
			return 'Price must be a valid amount.';

		if (
			compareAtPrice.trim() &&
			(!Number.isFinite(Number(compareAtPrice)) || Number(compareAtPrice) < 0)
		) {
			return 'Compare-at price must be a valid amount.';
		}

		if (dealEndsAt && Number.isNaN(new Date(dealEndsAt).getTime()))
			return 'Deal end date is invalid.';

		for (const option of options) {
			if (!option.name.trim()) return 'Every option group needs a name.';

			for (const value of option.values) {
				if (!value.value.trim()) return 'Every option value needs text.';
			}
		}

		for (const variant of variants) {
			if (!variant.sku.trim() || !variant.name.trim()) return 'Every variant needs a SKU and name.';
			if (!Number.isFinite(Number(variant.price)) || Number(variant.price) < 0)
				return 'Every variant needs a valid price.';
		}

		return '';
	}

	// Stock changes go through inventory adjustments, so keep the form's
	// stock in step with the server to avoid saving a stale value back.
	function syncStock(stocks: Array<{ id: string; stock: number }>) {
		for (const { id, stock } of stocks) {
			const row = variants.find((variant) => variant.id === id);
			if (row) row.stock = String(stock);
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		const validationError = validate();
		if (validationError) {
			error = validationError;
			return;
		}

		saving = true;

		try {
			const endpoint = product?.id ? `/api/admin/products/${product.id}` : '/api/admin/products';
			const response = await fetch(endpoint, {
				method: product?.id ? 'PATCH' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify($state.snapshot(buildPayload()))
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw new Error(describeError(payload));

			await goto('/admin/products');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not save product';
		} finally {
			saving = false;
		}
	}
</script>

<form class="space-y-5" onsubmit={handleSubmit}>
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">
				{editing ? 'Edit product' : 'New product'}
			</h1>
			<p class="text-sm text-muted-foreground">
				{editing ? product?.name : 'Add a product to the catalog and configure its variants.'}
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button type="button" variant="outline" href="/admin/products">Cancel</Button>
			<Button type="submit" disabled={saving}>
				{#if saving}
					<LoaderCircle class="size-4 animate-spin" />
				{/if}
				{saving ? 'Saving…' : 'Save product'}
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

	<Tabs.Root bind:value={activeTab}>
		<Tabs.List>
			<Tabs.Trigger value="general">General</Tabs.Trigger>
			<Tabs.Trigger value="images">
				Images{images.length ? ` (${images.length})` : ''}
			</Tabs.Trigger>
			<Tabs.Trigger value="options">
				Options{options.length ? ` (${options.length})` : ''}
			</Tabs.Trigger>
			<Tabs.Trigger value="variants">
				Variants{variants.length ? ` (${variants.length})` : ''}
			</Tabs.Trigger>
			{#if editing && product}
				<Tabs.Trigger value="stock">Stock</Tabs.Trigger>
			{/if}
		</Tabs.List>

		<Tabs.Content value="general" class="mt-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>General information</Card.Title>
					<Card.Description>
						Core product details shown across the storefront and admin.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-5">
					<Field.Group>
						<Field.Field>
							<Field.Label for="product-name">Name</Field.Label>
							<Input id="product-name" bind:value={name} placeholder="Product name" required />
						</Field.Field>

						<div class="grid gap-4 sm:grid-cols-2">
							<Field.Field>
								<Field.Label for="product-sku">SKU</Field.Label>
								<Input id="product-sku" bind:value={sku} placeholder="e.g. AUD-001" required />
							</Field.Field>

							<Field.Field>
								<Field.Label for="product-slug">Slug</Field.Label>
								<Input
									id="product-slug"
									bind:value={slug}
									placeholder="auto-generated when empty"
								/>
								<Field.Description>Leave empty to generate from the name.</Field.Description>
							</Field.Field>
						</div>

						<Field.Field>
							<Field.Label for="product-short-description">Short description</Field.Label>
							<Textarea
								id="product-short-description"
								bind:value={shortDescription}
								placeholder="One or two sentences for listings"
								rows={2}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="product-description">Description</Field.Label>
							<Textarea
								id="product-description"
								bind:value={description}
								placeholder="Full product description"
								rows={5}
							/>
						</Field.Field>
					</Field.Group>

					<Separator />

					<Field.Group>
						<div class="grid gap-4 sm:grid-cols-2">
							<Field.Field>
								<Field.Label for="product-status">Status</Field.Label>
								<Select.Root type="single" bind:value={status}>
									<Select.Trigger id="product-status" class="w-full">
										<Select.Value placeholder="Select status" />
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="draft" label="Draft">Draft</Select.Item>
										<Select.Item value="active" label="Active">Active</Select.Item>
										<Select.Item value="archived" label="Archived">Archived</Select.Item>
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label for="product-currency">Currency</Field.Label>
								<Input
									id="product-currency"
									bind:value={currency}
									maxlength={3}
									placeholder="USD"
									class="uppercase"
								/>
							</Field.Field>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<Field.Field>
								<Field.Label for="product-price">Price</Field.Label>
								<Input
									id="product-price"
									type="number"
									min="0"
									step="0.01"
									bind:value={price}
									placeholder="0.00"
								/>
								<Field.Description>Amount in dollars, stored as integer cents.</Field.Description>
							</Field.Field>

							<Field.Field>
								<Field.Label for="product-compare-price">Compare-at price</Field.Label>
								<Input
									id="product-compare-price"
									type="number"
									min="0"
									step="0.01"
									bind:value={compareAtPrice}
									placeholder="Optional"
								/>
								<Field.Description>Leave empty when the product is not on sale.</Field.Description>
							</Field.Field>
						</div>

						<div class="grid gap-4 sm:grid-cols-2">
							<Field.Field>
								<Field.Label for="product-brand">Brand</Field.Label>
								<Select.Root type="single" bind:value={brandId}>
									<Select.Trigger id="product-brand" class="w-full">
										<Select.Value placeholder="No brand" />
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="none" label="No brand">No brand</Select.Item>
										{#each brands as brand (brand.id)}
											<Select.Item value={brand.id} label={brand.name}>{brand.name}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>

							<Field.Field>
								<Field.Label for="product-category">Category</Field.Label>
								<Select.Root type="single" bind:value={categoryId}>
									<Select.Trigger id="product-category" class="w-full">
										<Select.Value placeholder="No category" />
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="none" label="No category">No category</Select.Item>
										{#each categories as category (category.id)}
											<Select.Item value={category.id} label={category.name}>
												{category.parentName
													? `${category.parentName} / ${category.name}`
													: category.name}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Field>
						</div>
					</Field.Group>

					<Separator />

					<div class="grid gap-3 sm:grid-cols-3">
						<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">Featured</p>
								<p class="text-xs text-muted-foreground">Highlight on the storefront.</p>
							</div>
							<Switch bind:checked={isFeatured} aria-label="Featured product" />
						</div>

						<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">New arrival</p>
								<p class="text-xs text-muted-foreground">Show in new arrivals.</p>
							</div>
							<Switch bind:checked={isNewArrival} aria-label="New arrival" />
						</div>

						<div class="flex items-center justify-between gap-3 rounded-lg border p-3">
							<div>
								<p class="text-sm font-medium">Deal</p>
								<p class="text-xs text-muted-foreground">Mark as a limited-time deal.</p>
							</div>
							<Switch bind:checked={isDeal} aria-label="Product deal" />
						</div>
					</div>

					<Field.Field>
						<Field.Label for="product-deal-ends">Deal ends</Field.Label>
						<Input
							id="product-deal-ends"
							type="datetime-local"
							bind:value={dealEndsAt}
							disabled={!isDeal}
						/>
					</Field.Field>

					<Separator />

					<Field.Group>
						<Field.Field>
							<Field.Label for="product-shipping">Shipping info</Field.Label>
							<Textarea
								id="product-shipping"
								bind:value={shippingInfo}
								placeholder="Shipping details shown on the product page"
								rows={3}
							/>
						</Field.Field>

						<Field.Field>
							<Field.Label for="product-returns">Return policy</Field.Label>
							<Textarea
								id="product-returns"
								bind:value={returnPolicy}
								placeholder="Return policy shown on the product page"
								rows={3}
							/>
						</Field.Field>
					</Field.Group>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="images" class="mt-4">
			<Card.Root>
				<Card.Content>
					<ProductImagesField bind:images />
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="options" class="mt-4">
			<Card.Root>
				<Card.Content>
					<ProductOptionsEditor bind:options />
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<Tabs.Content value="variants" class="mt-4">
			<Card.Root>
				<Card.Content>
					<ProductVariantsEditor bind:variants {options} />
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		{#if editing && product}
			<Tabs.Content value="stock" class="mt-4">
				<Card.Root>
					<Card.Content>
						<ProductStockPanel productId={product.id} onstockchange={syncStock} />
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		{/if}
	</Tabs.Root>

	<div class="flex justify-end gap-2 border-t pt-4">
		<Button type="button" variant="outline" href="/admin/products">Cancel</Button>
		<Button type="submit" disabled={saving}>
			{saving ? 'Saving…' : 'Save product'}
		</Button>
	</div>
</form>
