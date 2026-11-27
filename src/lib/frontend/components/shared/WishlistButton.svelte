<script lang="ts">
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Heart } from '@lucide/svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { authClient } from '#lib/frontend/modules/auth/index.ts';
	import { wishlist } from '#lib/frontend/modules/account/index.ts';
	import { ApiError } from '#lib/frontend/modules/shared/http.ts';

	let {
		productId,
		label = false,
		class: className
	}: {
		productId: string;
		label?: boolean;
		class?: string;
	} = $props();

	const session = authClient.useSession();

	let busy = $state(false);
	let error = $state('');

	const active = $derived($session.data ? wishlist.isWishlisted(productId) : false);

	$effect(() => {
		if ($session.isPending || !$session.data) return;

		void wishlist.ensure().catch((cause) => {
			if (!(cause instanceof ApiError && cause.status === 401)) {
				error = errorMessage(cause, 'components_wishlist_load_failed');
			}
		});
	});

	function redirectToLogin() {
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`);
	}

	async function handleClick() {
		if (busy || $session.isPending) return;

		if (!$session.data) {
			redirectToLogin();
			return;
		}

		busy = true;
		error = '';

		try {
			if (active) {
				await wishlist.remove(productId);
			} else {
				await wishlist.add(productId);
			}
		} catch (cause) {
			if (cause instanceof ApiError && cause.status === 401) {
				redirectToLogin();
			} else {
				error = errorMessage(cause, 'components_wishlist_update_failed');
			}
		} finally {
			busy = false;
		}
	}
</script>

<Button
	variant={active ? 'destructive' : 'outline'}
	size={label ? 'sm' : 'icon'}
	class={className}
	aria-pressed={active}
	aria-label={active ? m.components_wishlist_remove() : m.components_wishlist_add()}
	title={error || undefined}
	disabled={busy}
	onclick={handleClick}
>
	{#if busy}
		<Spinner class="size-4" />
	{:else}
		<Heart class={active ? 'fill-current' : undefined} />
	{/if}
	{#if label}
		<span>{active ? m.components_wishlist_added() : m.common_wishlist()}</span>
	{/if}
</Button>
