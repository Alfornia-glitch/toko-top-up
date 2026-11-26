<script lang="ts">
	import {
		Gamepad2,
		Headset,
		Heart,
		House,
		LogOut,
		Menu,
		Package,
		Receipt,
		Search,
		ShoppingCart,
		Tag,
		User,
		CircleHelp
	} from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import LanguageSwitcher from '#lib/frontend/components/LanguageSwitcher.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as DropdownMenu from '#lib/frontend/components/ui/dropdown-menu/index.ts';
	import * as InputGroup from '#lib/frontend/components/ui/input-group/index.ts';
	import * as Sheet from '#lib/frontend/components/ui/sheet/index.ts';
	import UserAvatar from '#lib/frontend/components/UserAvatar.svelte';
	import { authClient, signOutUser } from '#frontend/modules/auth/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import { BRAND_NAME, HEADER_NAV_LINKS } from '#lib/frontend/content/navigation.topup.ts';

	const icons = {
		home: House,
		receipt: Receipt,
		tag: Tag,
		gamepad: Gamepad2,
		help: CircleHelp,
		headset: Headset
	};

	let mobileOpen = $state(false);
	let query = $state('');

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	function isActive(href: string) {
		return href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
	}

	onMount(() => {
		void home.ensure();
		void site.ensure();
		void cart.refresh();
	});

	function submitSearch(event: SubmitEvent) {
		event.preventDefault();
		mobileOpen = false;
		void goto('/products?q=' + encodeURIComponent(query));
	}
</script>

<header class="sticky top-0 z-40 w-full bg-background" data-name="Header">
	<div class="w-full">
		<div class="flex h-16 items-center gap-3 px-8 md:gap-5">
			<Sheet.Root bind:open={mobileOpen}>
				<Sheet.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon"
							class="md:hidden"
							aria-label={m.components_site_header_menu()}
						>
							<Menu />
						</Button>
					{/snippet}
				</Sheet.Trigger>
				<Sheet.Content side="left" class="w-72">
					<Sheet.Header>
						<Sheet.Title>{BRAND_NAME}</Sheet.Title>
					</Sheet.Header>
					<nav class="flex flex-col gap-1 px-4">
						{#each HEADER_NAV_LINKS as link (link.href)}
							{@const Icon = icons[link.icon]}
							<a
								href={link.href}
								onclick={() => (mobileOpen = false)}
								class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent {isActive(
									link.href
								)
									? 'bg-accent text-primary'
									: ''}"
							>
								<Icon class="size-4" />
								{link.label}
							</a>
						{/each}
					</nav>
				</Sheet.Content>
			</Sheet.Root>

			<a href="/" class="flex shrink-0 items-center gap-2 text-sm font-bold" data-name="Logo">
				<span
					class="grid size-8 place-items-center rounded-lg bg-primary text-xs text-primary-foreground"
				>
					{BRAND_NAME.slice(0, 2).toUpperCase()}
				</span>
				<span class="hidden tracking-wide uppercase sm:inline">{BRAND_NAME}</span>
			</a>

			<form onsubmit={submitSearch} class="max-w-2xl flex-1" role="search">
				<InputGroup.Root>
					<InputGroup.Addon>
						<Search />
					</InputGroup.Addon>
					<InputGroup.Input
						placeholder={m.components_site_header_search_placeholder()}
						aria-label={m.components_site_header_search_label()}
						bind:value={query}
					/>
				</InputGroup.Root>
			</form>

			<div class="ml-auto flex items-center gap-2">
				<LanguageSwitcher />
				<Button
					variant="ghost"
					size="icon"
					href="/cart"
					class="relative"
					aria-label={m.components_site_header_cart()}
				>
					<ShoppingCart />
					{#if cart.count > 0}
						<span
							class="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground"
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
									class="shrink-0 cursor-pointer"
									aria-label={m.components_site_header_account_menu()}
								>
									<UserAvatar image={user.image} name={user.name} email={user.email} />
								</button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content align="end" class="w-56">
							<DropdownMenu.Label>
								<div class="truncate text-sm font-medium">
									{user.name ?? m.components_site_header_account_fallback()}
								</div>
								<div class="truncate text-xs text-muted-foreground">{user.email ?? ''}</div>
							</DropdownMenu.Label>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onclick={() => void goto('/account')}>
								<User />
								{m.components_site_header_my_account()}
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => void goto('/account/orders')}>
								<Package />
								{m.components_site_header_my_orders()}
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={() => void goto('/account/wishlist')}>
								<Heart />
								{m.common_wishlist()}
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item variant="destructive" onclick={() => void signOutUser('/login')}>
								<LogOut />
								{m.common_logout()}
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				{:else}
					<Button variant="secondary" size="sm" href="/login">{m.common_login()}</Button>
					<Button size="sm" href="/login?mode=register" class="hidden sm:inline-flex">
						{m.common_signup()}
					</Button>
				{/if}
			</div>
		</div>

		<nav
			class="hidden [scrollbar-width:none] gap-1 overflow-x-auto border-t px-8 py-2 md:flex"
			aria-label={m.components_site_header_main_nav()}
		>
			{#each HEADER_NAV_LINKS as link (link.href)}
				{@const Icon = icons[link.icon]}
				<a
					href={link.href}
					aria-current={isActive(link.href) ? 'page' : undefined}
					class="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium whitespace-nowrap hover:bg-accent {isActive(
						link.href
					)
						? 'bg-accent text-primary'
						: ''}"
				>
					<Icon class="size-4" />
					{link.label}
				</a>
			{/each}
		</nav>
	</div>
</header>
