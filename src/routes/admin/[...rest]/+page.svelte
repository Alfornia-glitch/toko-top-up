<script lang="ts">
	import { page } from '$app/state';
	import { Construction } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';

	const section = $derived.by(() => {
		const segment = page.url.pathname.split('/').filter(Boolean).at(-1) ?? 'admin';

		return segment.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase());
	});
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{section}</h1>
		<p class="text-sm text-muted-foreground">This admin section is not available yet.</p>
	</div>

	<Card.Root>
		<Card.Content class="flex flex-col items-center gap-3 py-12 text-center">
			<Construction class="size-8 text-muted-foreground" />
			<div>
				<p class="font-medium">Coming in a later implementation phase</p>
				<p class="text-sm text-muted-foreground">
					The route exists so navigation stays consistent while features land.
				</p>
			</div>
			<a href="/admin" class="text-sm font-medium underline underline-offset-4">Back to dashboard</a
			>
		</Card.Content>
	</Card.Root>
</div>
