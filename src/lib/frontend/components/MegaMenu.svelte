<script lang="ts">
	import { onMount } from 'svelte';
	import DealCountdown from '#lib/frontend/components/storefront/DealCountdown.svelte';
	import { home } from '#lib/frontend/modules/commerce/home.svelte.ts';

	let { menu, close }: { menu: 'shops' | 'deals' | 'new' | 'pages'; close: () => void } = $props();

	onMount(() => {
		void home.ensure();
	});

	const isPages = $derived(menu === 'pages');

	const fallbackDepartments = [
		[
			'Topwear',
			'Casual Shirts',
			'T-Shirts',
			'Formal Shirts',
			'Jackets',
			'Rain Jackets',
			'Blazers & Coats',
			'Sweatshirts',
			'Suits'
		],
		['Bottomwear', 'Jeans', 'Casual Trousers', 'Formal Trousers', 'Shots', 'Track Pents'],
		[
			'Personal Care',
			'Cleansers',
			'Sunscreen:',
			'Shampoo',
			'Face Masks',
			'Perfume/Cologne',
			'Makeup Remover'
		],
		['Festive Wear', 'Kurtas & Kurta Sets', 'Shervanis', 'Nehru Jackets'],
		['Gadget', 'Smart Wearables', 'Headphones', 'Speakers', 'Fitness Gadgets'],
		['Toys & Games', 'Wallets', 'Belts', 'Phone Cases', 'Accessory gift sets', 'Helmets']
	];

	const pageColumns = [
		[
			'Main Page',
			'Home Page',
			'Hero layout',
			'Hero layout 1',
			'Hero layout 2',
			'Hero layout 3',
			'Product Listing',
			'Product Listing With Sidebar',
			'Product Listing With Banner',
			'Category Page',
			'Category Listing'
		],
		[
			'Authentication',
			'Login',
			'Register',
			'Forgot Password',
			'Reset Password',
			'Two Factor Authentication',
			'Verify Email',
			'Product Details',
			'Product Detail Carousel view',
			'Product Detail Gallery View'
		],
		[
			'Profile Pages',
			'My Account',
			'My Wishlist',
			'My Orders',
			'Order Details',
			'My Addresses',
			'Payment',
			'Giftcards',
			'Return & Refund',
			'Email Newsletter',
			'Support Tickets',
			'Exchange & Returns',
			'Track Order'
		],
		[
			'Checkout Pages',
			'Cart Page',
			'Address Page',
			'Payment Page',
			'Empty Cart',
			'Miscellaneous',
			'Help',
			'Shipping related Questions',
			'Purchase Protection',
			'Privacy Policy'
		]
	];

	const pageLinks: Record<string, string> = {
		'Home Page': '/',
		'Hero layout': '/hero-layout',
		'Hero layout 1': '/hero-layout/1',
		'Hero layout 2': '/hero-layout/2',
		'Hero layout 3': '/hero-layout/3',
		'Category Page': '/categories/electronics',
		Login: '/login',
		Register: '/signup',
		'Forgot Password': '/forgot-password',
		'Reset Password': '/reset-password',
		'Two Factor Authentication': '/two-factor',
		'Verify Email': '/verify-email',
		'Category Listing': '/categories',
		'My Account': '/account',
		'My Wishlist': '/account/wishlist',
		'My Orders': '/account/orders',
		'Order Details': '/account/orders/latest',
		'My Addresses': '/account/addresses',
		Help: '/help',
		'Shipping related Questions': '/help/shipping',
		'Purchase Protection': '/help/purchase-protection',
		'Privacy Policy': '/privacy-policy',
		'Cart Page': '/cart',
		'Address Page': '/checkout/address',
		'Payment Page': '/checkout/payment',
		'Empty Cart': '/cart/empty',
		'Product Detail Gallery View': '/products/shirt',
		Payment: '/account/payment',
		Giftcards: '/account/gift-cards',
		'Return & Refund': '/account/returns-refunds',
		'Email Newsletter': '/account/newsletter',
		'Support Tickets': '/account/support-tickets',
		'Track Order': '/account/order-tracking',
		'Product Listing With Sidebar': '/products?sidebar=1',
		'Product Listing With Banner': '/products?banner=1',
		'Product Listing': '/products'
	};

	function getHref(item: string): string {
		if (pageLinks[item]) return pageLinks[item];
		if (item.includes('Product Detail')) return '/products/phone';
		return '/products';
	}

	type MenuColumn = { label: string; href: string }[];

	const categoryDepartments = $derived(
		home.categories
			.filter((category) => category.parentId === null)
			.slice(0, 6)
			.map((root) => [
				{ label: root.name, href: `/products?categoryId=${encodeURIComponent(root.id)}` },
				...home.categories
					.filter((category) => category.parentId === root.id)
					.slice(0, 9)
					.map((child) => ({
						label: child.name,
						href: `/products?categoryId=${encodeURIComponent(child.id)}`
					}))
			])
	);

	const departments: MenuColumn[] = $derived(
		categoryDepartments.length > 0
			? categoryDepartments
			: fallbackDepartments.map((column) =>
					column.map((item) => ({ label: item, href: getHref(item) }))
				)
	);

	const pages: MenuColumn[] = $derived(
		pageColumns.map((column) => column.map((item) => ({ label: item, href: getHref(item) })))
	);

	const columns: MenuColumn[] = $derived(isPages ? pages : departments);

	const highlights = ['Festive Wear', 'Gadget', 'Toys & Games'];
	const pageHighlights = [
		'Hero layout',
		'Product Listing',
		'Category Page',
		'Product Details',
		'Miscellaneous'
	];

	function isHighlighted(item: string, index: number): boolean {
		if (index === 0) return true;
		return isPages ? pageHighlights.includes(item) : highlights.includes(item);
	}
</script>

<div
	class="absolute top-[70px] left-1/2 z-50 max-h-[85vh] w-[calc(100%-16px)] max-w-[1432px] -translate-x-1/2 overflow-y-auto rounded-[14px] border border-[#0a0a0a] bg-white p-4 shadow-xl sm:top-[142px] sm:w-[calc(100%-32px)] sm:p-6"
	role="presentation"
	onmouseleave={close}
>
	<div class="mb-4 flex items-center justify-between border-b pb-3 sm:hidden">
		<span class="font-['Geist:SemiBold'] text-base capitalize">{menu} Menu</span>
		<button class="rounded p-1 text-gray-500 hover:text-black" onclick={close}>✕</button>
	</div>
	<div class="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-[2fr_1fr]">
		<div
			class="grid grid-cols-2 gap-x-6 gap-y-4 sm:gap-x-10 {isPages
				? 'sm:grid-cols-4'
				: 'sm:grid-cols-3'}"
		>
			{#each columns as column, columnIndex (columnIndex)}
				<div class="flex flex-col gap-2 text-[14px] leading-5">
					{#each column as item, itemIndex (item.label)}
						<a
							href={item.href}
							class={isHighlighted(item.label, itemIndex)
								? "mt-2 font-['Geist:Medium'] text-[#0a0a0a]"
								: 'text-[#737373] transition-colors hover:text-black'}
							onclick={close}
						>
							{item.label}
						</a>
					{/each}
				</div>
			{/each}
		</div>
		<div
			class="flex min-h-[280px] flex-col items-center rounded-[14px] p-6 text-center sm:min-h-[390px] sm:px-8 sm:pt-10 {menu ===
			'new'
				? 'bg-[#eaf8f0]'
				: menu === 'deals'
					? 'bg-[#eef8fd]'
					: 'bg-gradient-to-b from-[#f4ede4] to-white'}"
		>
			<h2 class="font-['Geist:Bold'] text-[22px] leading-7 sm:text-[28px] sm:leading-8">
				{#if isPages}
					Ultimate <span class="text-[#16a34a]">eCommerce</span><br />Template Pages
				{:else if menu === 'deals'}
					Big Savings on Today’s<br />Mega Deals
				{:else}
					Enjoy Flat <span class="text-[#dc2626]">50% OFF</span><br />Across All Categories
				{/if}
			</h2>
			<p class="mt-3 font-['Geist:Regular'] text-[15px] sm:mt-5 sm:text-[18px]">
				{#if isPages}
					Modern & customizable.
				{:else if menu === 'deals'}
					Offers end today:
				{:else}
					Grab Your Favorites Now.
				{/if}
			</p>
			{#if menu === 'deals'}
				{#if home.deals.length > 0}
					<div class="mt-3 w-full">
						<DealCountdown endsAt={home.deals[0]?.dealEndsAt} />
					</div>
				{/if}
			{:else if !isPages}
				<button
					class="mt-4 rounded-xl bg-[#171717] px-6 py-2.5 font-['Geist:Medium'] text-sm text-white"
					onclick={close}
				>
					Shop Now&nbsp; →
				</button>
			{/if}
			<div
				class="mt-auto hidden h-[175px] w-full items-end justify-center gap-3 pb-5 opacity-60 sm:flex"
			>
				<span class="h-[130px] w-[28%] rounded-xl border-4 border-[#d4d4d4]"></span>
				<span class="h-[165px] w-[36%] rounded-xl border-4 border-[#d4d4d4]"></span>
				<span class="h-[130px] w-[28%] rounded-xl border-4 border-[#d4d4d4]"></span>
			</div>
		</div>
	</div>
</div>
