<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ShieldAlert } from '@lucide/svelte';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { authClient } from '#frontend/modules/auth/index.ts';

	let {
		role = 'admin',
		children
	}: {
		role?: 'admin' | 'superadmin';
		children: Snippet;
	} = $props();

	const session = authClient.useSession();

	const authorized = $derived.by(() => {
		const current = $session.data?.user.role;

		if (role === 'superadmin') return current === 'superadmin';

		return current === 'admin' || current === 'superadmin';
	});

	$effect(() => {
		if ($session.isPending || $session.data) return;

		const redirectTo = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(redirectTo)}`, { replaceState: true });
	});
</script>

{#if $session.isPending}
	<div class="flex min-h-svh items-center justify-center">
		<Spinner class="size-6" />
	</div>
{:else if authorized}
	{@render children()}
{:else if $session.data}
	<div class="flex min-h-svh items-center justify-center p-6">
		<Card.Root class="max-w-md text-center">
			<Card.Header>
				<ShieldAlert class="mx-auto size-8 text-destructive" />
				<Card.Title>Access denied</Card.Title>
				<Card.Description>
					Your account does not have permission to view this area.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	</div>
{/if}
