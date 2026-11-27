<script lang="ts">
	import { page } from '$app/state';
	import { Construction } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';

	// Menu labels for the known admin sections, resolved at render so the locale is read then.
	const SECTION_LABELS = new Map<string, () => string>([
		['products', () => m.common_products()],
		['categories', () => m.common_categories()],
		['brands', () => m.components_admin_sidebar_brands()],
		['inventory', () => m.components_admin_sidebar_inventory()],
		['orders', () => m.common_orders()],
		['payments', () => m.components_admin_sidebar_payments()],
		['returns', () => m.components_admin_sidebar_returns()],
		['customers', () => m.common_customers()],
		['reviews', () => m.components_admin_sidebar_reviews()],
		['coupons', () => m.components_admin_sidebar_coupons()],
		['gift-cards', () => m.components_admin_sidebar_gift_cards()],
		['support', () => m.components_admin_sidebar_support()],
		['newsletter', () => m.components_admin_sidebar_newsletter()],
		['content', () => m.components_admin_sidebar_content()],
		['media', () => m.components_admin_sidebar_media()],
		['reports', () => m.components_admin_sidebar_reports()]
	]);

	const section = $derived.by(() => {
		const segment = page.url.pathname.split('/').filter(Boolean).at(-1) ?? 'admin';
		const known = SECTION_LABELS.get(segment);

		if (known) return known();

		return segment.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase());
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{section}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_ops_rest_unavailable()}</p>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-3 py-12 text-center">
			<Construction class="size-8 text-muted-foreground" />
			<div>
				<p class="font-medium">{m.admin_ops_rest_coming_title()}</p>
				<p class="text-sm text-muted-foreground">
					{m.admin_ops_rest_coming_desc()}
				</p>
			</div>
			<a href="/admin" class="text-sm font-medium underline underline-offset-4"
				>{m.admin_ops_rest_back()}</a
			>
		</Card.Content>
	</Card.Root>
</div>
