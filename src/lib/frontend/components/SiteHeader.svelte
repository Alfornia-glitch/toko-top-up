<script lang="ts">
	import {
		ChevronDown,
		Heart,
		LogOut,
		Menu,
		Package,
		Search,
		ShoppingCart,
		Store,
		User
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { afterNavigate, goto } from '$app/navigation';
	import MegaMenu from './MegaMenu.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as DropdownMenu from '#lib/frontend/components/ui/dropdown-menu/index.ts';
	import * as Sheet from '#lib/frontend/components/ui/sheet/index.ts';
	import UserAvatar from '#lib/frontend/components/UserAvatar.svelte';
	import { authClient, signOutUser } from '#frontend/modules/auth/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';

	type MenuName = 'shops' | 'deals' | 'new';

	const BRAND = 'Shopix';
	const ROTATE_MS = 5000;

	let { announcementCount = 6 }: { announcementCount?: number } = $props();

	let menu = $state<MenuName | null>(null);
	let drawerOpen = $state(false);
	let query = $state('');
	let announcementIndex = $state(0);

	const announcements = $derived(home.announcements.slice(0, announcementCount));
	const announcement = $derived(
		announcements.length > 0 ? announcements[announcementIndex % announcements.length] : null
	);
	const rootCategories = $derived(home.categories.filter((category) => category.parentId === null));

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	onMount(() => {
		void home.ensure();
		void cart.refresh();

		const timer = setInterval(() => {
			if (announcements.length > 1) announcementIndex += 1;
		}, ROTATE_MS);
		return () => clearInterval(timer);
	});

	afterNavigate(() => {
		menu = null;
		drawerOpen = false;
	});

	function toggleMenu(name: MenuName) {
		menu = menu === name ? null : name;
	}

	function categoryHref(id: string): string {
		return `/products?categoryId=${encodeURIComponent(id)}`;
	}

	function submitSearch(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = query.trim();
		void goto(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products');
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') menu = null;
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

{#snippet searchForm(id: string)}
	<form class="relative w-full" role="search" onsubmit={submitSearch}>
		<Search
			class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
		/>
		<input
			{id}
			type="search"
			placeholder="Search products..."
			aria-label="Search products"
			bind:value={query}
			class="h-10 w-full rounded-lg border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
		/>
	</form>
{/snippet}

<header class="sticky top-0 z-40 w-full bg-background">
	{#if announcement}
		<div class="bg-foreground px-4 py-2 text-center text-sm font-medium text-background">
			{#if announcement.link}
				<a href={announcement.link} class="hover:underline">{announcement.text}</a>
			{:else}
				{announcement.text}
			{/if}
		</div>
	{/if}

	<div class="relative border-b">
		<div class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-8">
			<Sheet.Root bind:open={drawerOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							size="icon"
							class="md:hidden"
							aria-label="Open navigation menu"
						>
							<Menu />
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content side="left" class="overflow-y-auto p-4">
					<Sheet.Header class="p-0">
						<Sheet.Title>{BRAND}</Sheet.Title>
						<Sheet.Description class="sr-only">Site navigation</Sheet.Description>
					</Sheet.Header>
					{@render searchForm('search-mobile')}
					<nav aria-label="Mobile" class="flex flex-col gap-1">
						<a
							href="/products?deal=true"
							class="rounded-lg px-3 py-2 font-medium text-red-600 hover:bg-muted"
						>
							Today’s deals
						</a>
						<a
							href="/products?newArrival=true"
							class="rounded-lg px-3 py-2 font-medium hover:bg-muted"
						>
							New arrivals
						</a>
						<a href="/products" class="rounded-lg px-3 py-2 font-medium hover:bg-muted">
							All products
						</a>
						<p
							class="px-3 pt-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>
							Categories
						</p>
						{#each rootCategories as root (root.id)}
							{@const children = home.categories.filter((c) => c.parentId === root.id)}
							{#if children.length > 0}
								<details class="group rounded-lg">
									<summary
										class="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 hover:bg-muted"
									>
										{root.name}
										<ChevronDown class="size-4 transition-transform group-open:rotate-180" />
									</summary>
									<div class="flex flex-col pl-6">
										<a
											href={categoryHref(root.id)}
											class="rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
										>
											All {root.name}
										</a>
										{#each children as child (child.id)}
											<a
												href={categoryHref(child.id)}
												class="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
											>
												{child.name}
											</a>
										{/each}
									</div>
								</details>
							{:else}
								<a href={categoryHref(root.id)} class="rounded-lg px-3 py-2 hover:bg-muted">
									{root.name}
								</a>
							{/if}
						{/each}
					</nav>
					<div class="mt-auto flex flex-col gap-1 border-t pt-3">
						{#if user}
							<a href="/account" class="rounded-lg px-3 py-2 hover:bg-muted">My account</a>
							<a href="/account/orders" class="rounded-lg px-3 py-2 hover:bg-muted">My orders</a>
							<a href="/account/wishlist" class="rounded-lg px-3 py-2 hover:bg-muted">My wishlist</a
							>
							<button
								type="button"
								onclick={() => void signOutUser('/login')}
								class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-muted"
							>
								<LogOut class="size-4" />
								Sign out
							</button>
						{:else}
							<Button href="/login" variant="outline">Sign in</Button>
						{/if}
					</div>
				</Sheet.Content>
			</Sheet.Root>

			<a href="/" class="flex shrink-0 items-center gap-2" aria-label="{BRAND} home">
				<span
					class="flex size-8 items-center justify-center rounded-lg bg-foreground text-background"
				>
					<Store class="size-4" />
				</span>
				<span class="text-lg font-semibold sm:text-xl">{BRAND}</span>
			</a>

			<div class="mx-auto hidden w-full max-w-xl md:block">
				{@render searchForm('search-desktop')}
			</div>

			<div class="ml-auto flex items-center gap-1 sm:gap-2">
				<Button
					href="/products"
					variant="ghost"
					size="icon"
					class="md:hidden"
					aria-label="Search products"
				>
					<Search />
				</Button>
				<Button
					href="/account/wishlist"
					variant="ghost"
					size="icon"
					class="hidden sm:inline-flex"
					aria-label="Wishlist"
				>
					<Heart />
				</Button>
				<Button
					href="/cart"
					variant="ghost"
					size="icon"
					class="relative"
					aria-label="Cart, {cart.count} items"
				>
					<ShoppingCart />
					{#if cart.count > 0}
						<span
							class="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-medium text-white"
						>
							{cart.count}
						</span>
					{/if}
				</Button>
				{#if user}
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									class="ml-1 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									aria-label="Account menu"
								>
									<UserAvatar
										image={user.image}
										name={user.name}
										email={user.email}
										class="size-8"
										labelClass="text-xs"
									/>
								</button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-56">
							<DropdownMenu.Label>
								<div class="truncate font-medium">{user.name ?? 'Account'}</div>
								<div class="truncate text-xs text-muted-foreground">{user.email ?? ''}</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={() => void goto('/account')}>
								<User />
								My account
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => void goto('/account/orders')}>
								<Package />
								My orders
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => void goto('/account/wishlist')}>
								<Heart />
								My wishlist
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item variant="destructive" onclick={() => void signOutUser('/login')}>
								<LogOut />
								Sign out
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else}
					<Button href="/login" variant="outline" class="ml-1">Sign in</Button>
				{/if}
			</div>
		</div>
	</div>
</header>
