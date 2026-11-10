<script lang="ts">
	import { Heart, LogOut, Package, User } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MegaMenu from './MegaMenu.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as DropdownMenu from '#lib/frontend/components/ui/dropdown-menu/index.ts';
	import UserAvatar from '#lib/frontend/components/UserAvatar.svelte';
	import { authClient, signOutUser } from '#frontend/modules/auth/index.ts';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';
	import { cart } from '#lib/frontend/modules/commerce/cart.svelte.ts';
	import {
		HEADER_MENU_LABELS,
		HEADER_QUICK_LINKS,
		HEADER_TOP_LINKS
	} from '#lib/frontend/content/navigation.ts';
	import {
		imgPic,
		imgOrnament54,
		imgOrnament51,
		imgOrnament52,
		imgOrnament53,
		imgLeftIcon,
		imgEllipse90,
		imgGroup,
		imgGroup1,
		imgLeftIcon1,
		imgLeftIcon2,
		imgLeftIcon3,
		imgLeftIcon4,
		imgIcon2,
		imgIcon3
	} from '#lib/frontend/shellAssets.ts';

	let { announcementCount = 6 }: { announcementCount?: number } = $props();

	let menu = $state<'shops' | 'deals' | 'new' | 'pages' | null>(null);
	let mobileMenuOpen = $state(false);
	let query = $state('');

	const ornaments = [
		imgOrnament54,
		imgOrnament51,
		imgOrnament52,
		imgOrnament53,
		imgOrnament54,
		imgOrnament54
	];
	const announcements = $derived(home.announcements.slice(0, announcementCount));

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	onMount(() => {
		void home.ensure();
		void site.ensure();
		void cart.refresh();
	});

	function toggleMenu(name: 'shops' | 'deals' | 'new' | 'pages') {
		menu = menu === name ? null : name;
	}

	function submitSearch(event: SubmitEvent) {
		event.preventDefault();
		void goto('/products?q=' + encodeURIComponent(query));
	}
</script>

<div
	class="relative flex w-full max-w-[1440px] shrink-0 flex-col content-stretch items-start"
	data-name="Header"
>
	<div
		class="relative flex w-full shrink-0 content-stretch items-center justify-center gap-[28px] overflow-x-auto bg-black py-[6px]"
		data-name="Flex horizontal"
	>
		{#each announcements as announcement, i (announcement.id)}
			<div
				class={i === 0
					? 'relative flex shrink-0 content-stretch items-center gap-[16px]'
					: 'relative flex hidden shrink-0 content-stretch items-center gap-[16px] sm:flex'}
				data-name="Flex horizontal"
			>
				<p
					class="relative shrink-0 overflow-hidden font-['Geist:SemiBold'] leading-[24px] font-semibold [word-break:break-word] {i ===
					0
						? 'text-[14px] sm:text-[16px]'
						: 'text-[16px]'} text-ellipsis whitespace-nowrap text-white"
				>
					{#if announcement.link}
						<a href={announcement.link} class="hover:underline">{announcement.text}</a>
					{:else}
						{announcement.text}
					{/if}
				</p>
				<div
					class="relative shrink-0 {i === 0 ? 'size-[20px] sm:size-[24px]' : 'size-[24px]'}"
					data-name="Ornament"
				>
					<img
						alt=""
						class="absolute inset-0 block size-full max-w-none"
						src={ornaments[i % ornaments.length]}
					/>
				</div>
			</div>
		{/each}
	</div>
	<div
		class="relative hidden w-full shrink-0 content-stretch items-center justify-center bg-[#f5f5f5] py-[8px] md:flex"
		data-name="Flex Horizontal"
	>
		<div
			class="relative flex max-w-[1280px] min-w-px flex-[1_0_0] content-stretch items-center gap-[40px] px-[32px]"
			data-name="Navbar Container"
		>
			<div class="flex flex-[1_0_0] flex-row items-center self-stretch">
				<div
					class="relative flex h-full min-w-px flex-[1_0_0] content-stretch items-center gap-[16px] font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
					data-name="Flex Horizontal"
				>
					{#each HEADER_TOP_LINKS as link (link.href)}
						<a href={link.href} class="relative shrink-0 hover:underline">{link.label}</a>
					{/each}
				</div>
			</div>
			<div
				class="relative flex min-w-px flex-[1_0_0] content-stretch items-center justify-end gap-[6px]"
				data-name="Flex horizontal"
			>
				<div class="relative flex shrink-0 content-stretch items-center gap-[6px]">
					<div
						class="relative flex shrink-0 content-stretch items-center justify-center gap-[8px]"
						data-name="Menu Item"
					>
						<p
							class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							English
						</p>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon} />
						</div>
					</div>
					<div
						class="relative flex shrink-0 content-stretch items-center justify-center gap-[8px]"
						data-name="Menu Item"
					>
						<p
							class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							{site.currency}
						</p>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon} />
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div
		class="relative flex w-full shrink-0 flex-col content-stretch items-center justify-center border-b border-solid border-[#e5e5e5] bg-white py-[12px] sm:py-[16px]"
		data-name="Flex Horizontal"
	>
		<div
			class="relative flex w-full max-w-[1280px] shrink-0 content-stretch items-center justify-between px-[16px] sm:px-[32px]"
			data-name="Navbar Container"
		>
			<div class="flex items-center gap-3">
				<button
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					class="flex h-8 w-8 flex-col items-center justify-center rounded-lg border border-[#e5e5e5] p-1.5 focus:outline-none md:hidden"
					aria-label="Toggle Navigation Menu"
				>
					<span
						class="block h-0.5 w-4 bg-[#0a0a0a] transition-transform {mobileMenuOpen
							? 'translate-y-1 rotate-45'
							: '-translate-y-0.5'}"
					></span>
					<span
						class="block h-0.5 w-4 bg-[#0a0a0a] transition-opacity {mobileMenuOpen
							? 'opacity-0'
							: 'my-0.5'}"
					></span>
					<span
						class="block h-0.5 w-4 bg-[#0a0a0a] transition-transform {mobileMenuOpen
							? '-translate-y-1 -rotate-45'
							: 'translate-y-0.5'}"
					></span>
				</button>
				<a
					href="/"
					class="relative flex shrink-0 content-stretch items-center justify-center"
					data-name="Logo"
				>
					<div
						class="relative flex h-[32px] shrink-0 content-stretch items-center gap-[8px]"
						data-name="shopix-logo"
					>
						<div
							class="relative inline-grid shrink-0 grid-cols-[max-content] grid-rows-[max-content] place-items-start leading-[0]"
						>
							<div class="relative col-1 row-1 mt-0 ml-0 size-[28px]">
								<div class="absolute inset-[-3.57%]">
									<img alt="" class="block size-full max-w-none" src={imgEllipse90} />
								</div>
							</div>
							<div
								class="relative col-1 row-1 mt-0 ml-0 inline-grid grid-cols-[max-content] grid-rows-[max-content] place-items-start"
								data-name="Mask group"
							>
								<div
									class="relative col-1 row-1 mt-[5px] ml-[4px] inline-grid grid-cols-[max-content] grid-rows-[max-content] place-items-start"
									data-name="Group"
								>
									<div
										class="relative col-1 row-1 mt-0 ml-0 h-[23.918px] w-[20px] mask-intersect mask-alpha mask-size-[28px_28px] mask-no-clip mask-position-[-4px_-5px] mask-no-repeat"
										style="mask-image: url('{imgGroup}')"
										data-name="Group"
									>
										<div class="absolute inset-[0_-5%_-4.18%_-5%]">
											<img alt="" class="block size-full max-w-none" src={imgGroup1} />
										</div>
									</div>
								</div>
							</div>
						</div>
						<div
							class="relative flex shrink-0 content-stretch items-center justify-center pt-[2px]"
						>
							<div
								class="relative flex shrink-0 flex-col justify-end font-['Inter:Semi_Bold'] text-[18px] leading-[0] font-semibold [word-break:break-word] whitespace-nowrap text-[#0a0a0a] not-italic sm:text-[20px]"
							>
								<p class="leading-[26px]">Shopix</p>
							</div>
						</div>
					</div>
				</a>
			</div>

			<div class="hidden flex-row items-center self-stretch md:flex">
				<div
					class="relative flex h-full shrink-0 content-stretch items-center gap-[6px]"
					data-name="Row"
				>
					<button
						class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[10px] px-[16px] py-[8px]"
						data-name="Menu Item"
						onclick={() => toggleMenu('shops')}
					>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon1} />
						</div>
						<p
							class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							{HEADER_MENU_LABELS[0]}
						</p>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon} />
						</div>
					</button>
					<button
						class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[10px] rounded-[8px] bg-[#f5f5f5] px-[16px] py-[8px]"
						data-name="Menu Item"
						onclick={() => toggleMenu('deals')}
					>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon2} />
						</div>
						<p
							class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							{HEADER_MENU_LABELS[1]}
						</p>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon} />
						</div>
					</button>
					<button
						class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[10px] px-[16px] py-[8px]"
						data-name="Menu Item"
						onclick={() => toggleMenu('new')}
					>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon3} />
						</div>
						<p
							class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							{HEADER_MENU_LABELS[2]}
						</p>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon} />
						</div>
					</button>
					<button
						class="relative flex shrink-0 cursor-pointer content-stretch items-center justify-center gap-[10px] px-[16px] py-[8px]"
						data-name="Menu Item"
						onclick={() => toggleMenu('pages')}
					>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon4} />
						</div>
						<p
							class="relative shrink-0 font-['Geist:Medium'] text-[14px] leading-[20px] font-medium [word-break:break-word] whitespace-nowrap text-[#0a0a0a]"
						>
							{HEADER_MENU_LABELS[3]}
						</p>
						<div class="relative size-[16px] shrink-0" data-name="Left-icon">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgLeftIcon} />
						</div>
					</button>
				</div>
			</div>

			<div
				class="relative flex content-stretch items-center justify-end gap-[12px] sm:gap-[16px]"
				data-name="Flex horizontal"
			>
				<div
					class="relative hidden w-[220px] shrink-0 flex-col content-stretch items-start gap-[8px] lg:flex"
					data-name="Default Input"
				>
					<form
						class="relative flex w-full shrink-0 content-stretch items-start"
						data-name="input-container"
						onsubmit={submitSearch}
					>
						<div
							class="relative flex h-[32px] min-w-px flex-[1_0_0] content-stretch items-center gap-[6px] rounded-[10px] border border-solid border-[#e5e5e5] bg-white px-[10px] py-[4px]"
							data-name="input"
						>
							<input
								type="text"
								placeholder="Search products..."
								aria-label="Search products"
								bind:value={query}
								class="w-full border-none bg-transparent font-['Geist:Regular'] text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#737373]"
							/>
						</div>
					</form>
				</div>
				<div
					class="relative flex shrink-0 content-stretch items-center gap-[8px]"
					data-name="Flex Horizontal"
				>
					<a
						href="/categories"
						class="relative flex size-[36px] shrink-0 content-stretch items-center justify-center gap-[8px] p-[6px]"
						data-name="Icon"
					>
						<div class="relative size-[22px] shrink-0" data-name="ICON">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon2} />
						</div>
						<div
							class="absolute bottom-[21px] left-[21px] flex size-[14px] content-stretch items-center justify-center gap-[1.714px] rounded-[8570.571px] bg-[#dc2626] px-[3.429px] py-[1.714px]"
							data-name="Solid Badge"
						>
							<div
								class="relative flex h-[12px] w-[6.857px] shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[0] font-medium [word-break:break-word] text-[#fafafa]"
							>
								<p class="leading-[13.714px]">{home.categories.length}</p>
							</div>
						</div>
					</a>
					<a
						href="/cart"
						class="relative flex size-[36px] shrink-0 content-stretch items-center justify-center gap-[8px] p-[6px]"
						data-name="Icon"
					>
						<div class="relative size-[22px] shrink-0" data-name="ICON">
							<img alt="" class="absolute inset-0 block size-full max-w-none" src={imgIcon3} />
						</div>
						<div
							class="absolute bottom-[21px] left-[21px] flex size-[14px] content-stretch items-center justify-center gap-[1.714px] rounded-[8570.571px] bg-[#dc2626] px-[3.429px] py-[1.714px]"
							data-name="Solid Badge"
						>
							<div
								class="relative flex h-[12px] w-[6.857px] shrink-0 flex-col justify-center text-center font-['Geist:Medium'] text-[12px] leading-[0] font-medium [word-break:break-word] text-[#fafafa]"
							>
								<p class="leading-[13.714px]">{cart.count}</p>
							</div>
						</div>
					</a>
					{#if user}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<button
										{...props}
										type="button"
										class="relative shrink-0 cursor-pointer"
										aria-label="Account menu"
									>
										<UserAvatar
											image={user.image}
											name={user.name}
											email={user.email}
											class="size-[32px]"
											labelClass="text-[12px]"
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
						<Button
							href="/login"
							variant="outline"
							aria-label="Sign in"
							class="h-[36px] rounded-[10px] border-[#e5e5e5] bg-white px-3 font-['Geist:Medium'] text-[14px] font-medium text-[#0a0a0a] hover:bg-[#f5f5f5]"
						>
							Sign in
						</Button>
					{/if}
				</div>
			</div>
		</div>

		{#if mobileMenuOpen}
			<div
				class="mt-2 flex w-full animate-in flex-col gap-2 border-t border-[#e5e5e5] bg-white px-4 py-3 shadow-lg slide-in-from-top md:hidden"
			>
				<p class="px-2 pt-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">
					Catalog
				</p>
				<button
					onclick={() => {
						toggleMenu('shops');
						mobileMenuOpen = false;
					}}
					class="flex items-center justify-between rounded-lg px-3 py-2 text-left font-['Geist:Medium'] text-sm hover:bg-gray-100"
				>
					<span>Shops Overview</span>
					<span class="text-xs text-gray-400">View</span>
				</button>
				<button
					onclick={() => {
						toggleMenu('deals');
						mobileMenuOpen = false;
					}}
					class="flex items-center justify-between rounded-lg px-3 py-2 text-left font-['Geist:Medium'] text-sm hover:bg-gray-100"
				>
					<span>Today’s Deal</span>
					<span class="text-xs font-semibold text-red-500">Hot</span>
				</button>
				<button
					onclick={() => {
						toggleMenu('new');
						mobileMenuOpen = false;
					}}
					class="flex items-center justify-between rounded-lg px-3 py-2 text-left font-['Geist:Medium'] text-sm hover:bg-gray-100"
				>
					<span>New Arrivals</span>
					<span class="text-xs font-semibold text-green-600">New</span>
				</button>
				<button
					onclick={() => {
						toggleMenu('pages');
						mobileMenuOpen = false;
					}}
					class="flex items-center justify-between rounded-lg px-3 py-2 text-left font-['Geist:Medium'] text-sm hover:bg-gray-100"
				>
					<span>Explore Pages</span>
					<span class="text-xs text-gray-400">All</span>
				</button>
				<div class="my-1 h-px bg-gray-100"></div>
				<p class="px-2 pt-1 text-xs font-semibold tracking-wider text-gray-400 uppercase">
					Quick Links
				</p>
				<div class="grid grid-cols-2 gap-2 text-xs">
					{#each HEADER_QUICK_LINKS as link (link.href)}
						<a
							href={link.href}
							onclick={() => (mobileMenuOpen = false)}
							class="rounded bg-gray-50 px-2 py-1.5 text-gray-700">{link.label}</a
						>
					{/each}
				</div>
				{#if user}
					<div class="my-1 h-px bg-gray-100"></div>
					<button
						type="button"
						onclick={() => void signOutUser('/login')}
						class="flex items-center gap-2 rounded-lg px-3 py-2 text-left font-['Geist:Medium'] text-sm text-red-600 hover:bg-gray-100"
					>
						<LogOut class="size-4" />
						Sign out
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if menu}
		<MegaMenu {menu} close={() => (menu = null)} />
	{/if}
</div>
