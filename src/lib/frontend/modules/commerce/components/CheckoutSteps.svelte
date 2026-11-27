<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { CreditCard, MapPin, ShoppingCart, UserRound } from '@lucide/svelte';
	import { site } from '../site.svelte.ts';

	type Step = 'cart' | 'details' | 'payment';

	let { current }: { current: Step } = $props();

	const order: Step[] = ['cart', 'details', 'payment'];
	const isTopup = $derived(site.storefrontLayout === 'topup');

	const steps = $derived([
		{ id: 'cart' as const, href: '/cart', label: m.common_cart(), icon: ShoppingCart },
		isTopup
			? {
					id: 'details' as const,
					href: '/checkout/account',
					label: m.checkout_account_step(),
					icon: UserRound
				}
			: {
					id: 'details' as const,
					href: '/checkout/address',
					label: m.common_address(),
					icon: MapPin
				},
		{
			id: 'payment' as const,
			href: '/checkout/payment',
			label: m.common_payment(),
			icon: CreditCard
		}
	]);

	const reached = (step: Step) => order.indexOf(step) <= order.indexOf(current);
</script>

<nav aria-label={m.cart_checkout_progress()} class="mt-6 rounded-xl border bg-muted/40 p-4 sm:p-5">
	<div class="flex items-center gap-2 sm:gap-4">
		{#each steps as step, index (step.id)}
			{#if index > 0}
				<div class="h-px flex-1 bg-border" aria-hidden="true"></div>
			{/if}
			<a
				href={step.href}
				aria-current={step.id === current ? 'step' : undefined}
				class="flex items-center gap-2 sm:gap-3"
			>
				<span
					class="flex size-9 shrink-0 items-center justify-center rounded-full {reached(step.id)
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'border bg-background text-muted-foreground'}"
				>
					<step.icon class="size-4" />
				</span>
				<span
					class="text-sm font-medium sm:text-base {reached(step.id)
						? 'text-foreground'
						: 'text-muted-foreground'}">{step.label}</span
				>
			</a>
		{/each}
	</div>
</nav>
