<script lang="ts">
	import { onMount } from 'svelte';
	import {
		CreditCard,
		Gift,
		Heart,
		LifeBuoy,
		Mail,
		MapPin,
		Package,
		RotateCcw,
		Truck
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import UserAvatar from '#lib/frontend/components/UserAvatar.svelte';
	import {
		AccountPageShell,
		EmptyState,
		OrderStatusBadge
	} from '#lib/frontend/components/account/index.ts';
	import { Badge } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import { Skeleton } from '#lib/frontend/components/ui/skeleton/index.ts';
	import { formatDate, formatMoney } from '#lib/frontend/modules/commerce/format.ts';
	import type {
		Address,
		OrderSummary,
		PaymentMethod,
		WishlistItem
	} from '#lib/frontend/modules/commerce/models.ts';
	import { authClient } from '#lib/frontend/modules/auth/index.ts';
	import { api, ApiError, unwrap } from '#lib/frontend/modules/shared/http.ts';

	type OrdersPayload = { data: OrderSummary[]; total?: number };
	type AddressesPayload = { data: Address[] };
	type PaymentMethodsPayload = { data: PaymentMethod[] };
	type WishlistPayload = { data: WishlistItem[] };

	const session = authClient.useSession();

	let loading = $state(true);
	let redirecting = false;

	let orders = $state<OrderSummary[] | null>(null);
	let ordersTotal = $state(0);
	let ordersError = $state('');

	let addresses = $state<Address[] | null>(null);
	let addressesError = $state('');

	let paymentMethods = $state<PaymentMethod[] | null>(null);
	let paymentMethodsError = $state('');

	let wishlist = $state<WishlistItem[] | null>(null);
	let wishlistError = $state('');

	const user = $derived($session.data?.user);

	const latestOrder = $derived(orders && orders.length > 0 ? orders[0] : null);

	const defaultAddress = $derived(
		addresses?.find((address) => address.isDefaultShipping) ?? addresses?.[0] ?? null
	);

	const defaultPaymentMethod = $derived(
		paymentMethods?.find((method) => method.isDefault && method.status !== 'removed') ??
			paymentMethods?.find((method) => method.status === 'active') ??
			null
	);

	const hasError = $derived(
		Boolean(ordersError || addressesError || paymentMethodsError || wishlistError)
	);

	function redirectToLogin(): void {
		if (redirecting) return;

		redirecting = true;
		const target = `${page.url.pathname}${page.url.search}`;
		void goto(`/login?redirectTo=${encodeURIComponent(target)}`, { replaceState: true });
	}

	function failureMessage(cause: unknown, fallback: string): string {
		if (cause instanceof ApiError && cause.status === 401) {
			redirectToLogin();
			return '';
		}

		return cause instanceof Error ? cause.message : fallback;
	}

	async function loadDashboard(): Promise<void> {
		loading = true;
		ordersError = '';
		addressesError = '';
		paymentMethodsError = '';
		wishlistError = '';

		const [ordersResult, addressesResult, paymentMethodsResult, wishlistResult] =
			await Promise.allSettled([
				api.get<OrdersPayload>('/api/orders?page=1&pageSize=5'),
				api.get<AddressesPayload>('/api/addresses'),
				api.get<PaymentMethodsPayload>('/api/payment-methods'),
				api.get<WishlistPayload>('/api/wishlist')
			]);

		if (ordersResult.status === 'fulfilled') {
			orders = unwrap(ordersResult.value);
			ordersTotal = ordersResult.value.total ?? orders.length;
		} else {
			orders = [];
			ordersError = failureMessage(ordersResult.reason, 'Could not load your orders.');
		}

		if (addressesResult.status === 'fulfilled') {
			addresses = unwrap(addressesResult.value);
		} else {
			addresses = [];
			addressesError = failureMessage(addressesResult.reason, 'Could not load your addresses.');
		}

		if (paymentMethodsResult.status === 'fulfilled') {
			paymentMethods = unwrap(paymentMethodsResult.value);
		} else {
			paymentMethods = [];
			paymentMethodsError = failureMessage(
				paymentMethodsResult.reason,
				'Could not load your payment methods.'
			);
		}

		if (wishlistResult.status === 'fulfilled') {
			wishlist = unwrap(wishlistResult.value);
		} else {
			wishlist = [];
			wishlistError = failureMessage(wishlistResult.reason, 'Could not load your wishlist.');
		}

		loading = false;
	}

	onMount(() => {
		let started = false;

		const unsubscribe = session.subscribe((state) => {
			if (state.isPending || started) return;

			if (!state.data?.user) {
				redirectToLogin();
				return;
			}

			started = true;
			void loadDashboard();
		});

		return unsubscribe;
	});
</script>

<AccountPageShell
	title="My account"
	description="Manage your profile, orders, addresses and preferences."
>
	{#if hasError}
		<div
			class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
			role="alert"
		>
			<span>Some account details could not be loaded.</span>
			<Button variant="outline" size="sm" onclick={() => void loadDashboard()}>Retry</Button>
		</div>
	{/if}

	<Card.Root>
		<Card.Content class="flex flex-col gap-4">
			<div class="flex items-center gap-4">
				<UserAvatar
					image={user?.image}
					name={user?.name}
					email={user?.email}
					class="size-14 sm:size-16"
					labelClass="text-lg"
				/>
				<div class="min-w-0 space-y-1">
					<div class="flex flex-wrap items-center gap-2">
						<p class="truncate text-lg font-semibold text-foreground">
							{user?.name || 'Your account'}
						</p>
						<Badge variant="secondary">Customer</Badge>
					</div>
					<p class="truncate text-sm text-muted-foreground">
						{user?.email || 'No email on file'}
					</p>
				</div>
			</div>
			<Separator />
			<div class="flex flex-wrap items-center gap-2">
				<Button href="/account/orders">View orders</Button>
				<Button variant="outline" href="/account/addresses">My addresses</Button>
			</div>
		</Card.Content>
	</Card.Root>

	{#if loading}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each Array(4) as _, index (index)}
				<Card.Root>
					<Card.Content class="flex flex-col gap-3">
						<Skeleton class="h-4 w-24" />
						<Skeleton class="h-8 w-32" />
						<Skeleton class="h-5 w-40" />
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
		<Card.Root>
			<Card.Header>
				<Card.Title>Recent orders</Card.Title>
				<Card.Description>Loading your latest orders.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-3">
				{#each Array(3) as _, index (index)}
					<Skeleton class="h-12 w-full" />
				{/each}
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			<Card.Root>
				<Card.Content class="flex h-full flex-col gap-3">
					<div class="flex items-start justify-between gap-3">
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Orders</p>
							<p class="text-2xl font-semibold text-foreground tabular-nums">{ordersTotal}</p>
						</div>
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
						>
							<Package class="size-4" aria-hidden="true" />
						</div>
					</div>
					<div class="min-h-10">
						{#if ordersError}
							<div
								class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
								role="alert"
							>
								{ordersError}
							</div>
						{:else if latestOrder}
							<div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
								<OrderStatusBadge status={latestOrder.status} />
								<span>{formatDate(latestOrder.placedAt)}</span>
							</div>
						{:else}
							<p class="text-sm text-muted-foreground">No orders yet.</p>
						{/if}
					</div>
					<Button variant="outline" size="sm" class="mt-auto w-fit" href="/account/orders">
						View orders
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex h-full flex-col gap-3">
					<div class="flex items-start justify-between gap-3">
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Wishlist</p>
							<p class="text-2xl font-semibold text-foreground tabular-nums">
								{wishlist?.length ?? 0}
							</p>
						</div>
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
						>
							<Heart class="size-4" aria-hidden="true" />
						</div>
					</div>
					<div class="min-h-10">
						{#if wishlistError}
							<div
								class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
								role="alert"
							>
								{wishlistError}
							</div>
						{:else if wishlist && wishlist.length > 0}
							<p class="truncate text-sm text-muted-foreground">{wishlist[0].name}</p>
						{:else}
							<p class="text-sm text-muted-foreground">No saved products yet.</p>
						{/if}
					</div>
					<Button variant="outline" size="sm" class="mt-auto w-fit" href="/account/wishlist">
						View wishlist
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex h-full flex-col gap-3">
					<div class="flex items-start justify-between gap-3">
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Addresses</p>
							<p class="text-2xl font-semibold text-foreground tabular-nums">
								{addresses?.length ?? 0}
							</p>
						</div>
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
						>
							<MapPin class="size-4" aria-hidden="true" />
						</div>
					</div>
					<div class="min-h-10">
						{#if addressesError}
							<div
								class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
								role="alert"
							>
								{addressesError}
							</div>
						{:else if defaultAddress}
							<p class="truncate text-sm font-medium text-foreground">
								{defaultAddress.recipientName}
							</p>
							<p class="truncate text-xs text-muted-foreground">{defaultAddress.city}</p>
						{:else}
							<p class="text-sm text-muted-foreground">No saved addresses yet.</p>
						{/if}
					</div>
					<Button variant="outline" size="sm" class="mt-auto w-fit" href="/account/addresses">
						Manage addresses
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex h-full flex-col gap-3">
					<div class="flex items-start justify-between gap-3">
						<div class="space-y-1">
							<p class="text-sm text-muted-foreground">Payment methods</p>
							<p class="text-2xl font-semibold text-foreground tabular-nums">
								{paymentMethods?.length ?? 0}
							</p>
						</div>
						<div
							class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
						>
							<CreditCard class="size-4" aria-hidden="true" />
						</div>
					</div>
					<div class="min-h-10">
						{#if paymentMethodsError}
							<div
								class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
								role="alert"
							>
								{paymentMethodsError}
							</div>
						{:else if defaultPaymentMethod}
							<p class="truncate text-sm font-medium text-foreground">
								{defaultPaymentMethod.brand} •••• {defaultPaymentMethod.last4}
							</p>
							<p class="text-xs text-muted-foreground">
								{defaultPaymentMethod.isDefault ? 'Default method' : 'Saved method'}
							</p>
						{:else}
							<p class="text-sm text-muted-foreground">No payment methods yet.</p>
						{/if}
					</div>
					<Button variant="outline" size="sm" class="mt-auto w-fit" href="/account/payment">
						Manage payment
					</Button>
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root>
			<Card.Header class="flex flex-row flex-wrap items-start justify-between gap-3">
				<div class="space-y-1">
					<Card.Title>Recent orders</Card.Title>
					<Card.Description>Your latest orders and their current status.</Card.Description>
				</div>
				<Button variant="outline" size="sm" href="/account/orders">View all</Button>
			</Card.Header>
			<Card.Content>
				{#if ordersError}
					<div
						class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
						role="alert"
					>
						{ordersError}
					</div>
				{:else if orders && orders.length > 0}
					<ul class="divide-y divide-border">
						{#each orders as order (order.id)}
							<li>
								<a
									href={`/account/orders/${order.orderNumber}`}
									class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
								>
									<div class="min-w-0 space-y-1">
										<p class="truncate text-sm font-medium text-foreground">
											#{order.orderNumber}
										</p>
										<p class="text-xs text-muted-foreground">{formatDate(order.placedAt)}</p>
									</div>
									<div class="flex flex-wrap items-center gap-3 sm:justify-end">
										<OrderStatusBadge status={order.status} />
										<span class="text-sm font-medium text-foreground tabular-nums">
											{formatMoney(order.grandTotalCents, order.currency)}
										</span>
									</div>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<EmptyState
						title="No orders yet"
						description="When you place an order it will appear here with its status."
					>
						{#snippet icon()}
							<Package class="size-5" aria-hidden="true" />
						{/snippet}
						{#snippet action()}
							<Button href="/products">Browse products</Button>
						{/snippet}
					</EmptyState>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title>Quick links</Card.Title>
			<Card.Description>Jump to the account tools you use most.</Card.Description>
		</Card.Header>
		<Card.Content class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<Button variant="outline" class="justify-start" href="/account/payment">
				<CreditCard class="size-4" aria-hidden="true" />
				Payment
			</Button>
			<Button variant="outline" class="justify-start" href="/account/gift-cards">
				<Gift class="size-4" aria-hidden="true" />
				Gift cards
			</Button>
			<Button variant="outline" class="justify-start" href="/account/returns-refunds">
				<RotateCcw class="size-4" aria-hidden="true" />
				Returns &amp; refunds
			</Button>
			<Button variant="outline" class="justify-start" href="/account/support-tickets">
				<LifeBuoy class="size-4" aria-hidden="true" />
				Support tickets
			</Button>
			<Button variant="outline" class="justify-start" href="/account/newsletter">
				<Mail class="size-4" aria-hidden="true" />
				Email newsletter
			</Button>
			<Button variant="outline" class="justify-start" href="/account/order-tracking">
				<Truck class="size-4" aria-hidden="true" />
				Track order
			</Button>
		</Card.Content>
	</Card.Root>
</AccountPageShell>
