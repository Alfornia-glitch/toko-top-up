<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { Component } from 'svelte';
	import { page } from '$app/state';
	import {
		AlertTriangle,
		BarChart3,
		Boxes,
		Database,
		FolderTree,
		Gift,
		Image as ImageIcon,
		KeyRound,
		LayoutDashboard,
		LifeBuoy,
		Mail,
		Package,
		Plug,
		RotateCcw,
		ScrollText,
		Server,
		Settings,
		Shield,
		QrCode,
		ShoppingCart,
		Star,
		Tag,
		TicketPercent,
		UserCog,
		Users
	} from '@lucide/svelte';
	import * as Sidebar from '#lib/frontend/components/ui/sidebar/index.ts';
	import { authClient } from '#frontend/modules/auth/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';

	type NavItem = { label: () => string; href: string; icon: Component<{ class?: string }> };

	const mainNav: NavItem[] = [
		{ label: () => m.components_admin_sidebar_dashboard(), href: '/admin', icon: LayoutDashboard },
		{ label: () => m.common_products(), href: '/admin/products', icon: Package },
		{ label: () => m.common_categories(), href: '/admin/categories', icon: FolderTree },
		{ label: () => m.components_admin_sidebar_brands(), href: '/admin/brands', icon: Tag },
		{ label: () => m.components_admin_sidebar_inventory(), href: '/admin/inventory', icon: Boxes },
		{ label: () => m.common_orders(), href: '/admin/orders', icon: ShoppingCart },
		{ label: () => m.components_admin_sidebar_payments(), href: '/admin/payments', icon: QrCode },
		{ label: () => m.components_admin_sidebar_returns(), href: '/admin/returns', icon: RotateCcw },
		{ label: () => m.common_customers(), href: '/admin/customers', icon: Users },
		{ label: () => m.components_admin_sidebar_reviews(), href: '/admin/reviews', icon: Star },
		{
			label: () => m.components_admin_sidebar_coupons(),
			href: '/admin/coupons',
			icon: TicketPercent
		},
		{ label: () => m.components_admin_sidebar_gift_cards(), href: '/admin/gift-cards', icon: Gift },
		{ label: () => m.components_admin_sidebar_support(), href: '/admin/support', icon: LifeBuoy },
		{ label: () => m.components_admin_sidebar_newsletter(), href: '/admin/newsletter', icon: Mail },
		{ label: () => m.components_admin_sidebar_content(), href: '/admin/content', icon: ImageIcon },
		{ label: () => m.components_admin_sidebar_media(), href: '/admin/media', icon: ImageIcon },
		{ label: () => m.components_admin_sidebar_reports(), href: '/admin/reports', icon: BarChart3 }
	];

	const superNav: NavItem[] = [
		{ label: () => m.components_admin_sidebar_overview(), href: '/admin/super', icon: Shield },
		{ label: () => m.components_admin_sidebar_users(), href: '/admin/super/users', icon: Users },
		{
			label: () => m.components_admin_sidebar_admins(),
			href: '/admin/super/admins',
			icon: UserCog
		},
		{ label: () => m.components_admin_sidebar_roles(), href: '/admin/super/roles', icon: KeyRound },
		{
			label: () => m.components_admin_sidebar_audit_logs(),
			href: '/admin/super/audit-logs',
			icon: ScrollText
		},
		{ label: () => m.common_settings(), href: '/admin/super/settings', icon: Settings },
		{
			label: () => m.components_admin_sidebar_integrations(),
			href: '/admin/super/integrations',
			icon: Plug
		},
		{
			label: () => m.components_admin_sidebar_storage(),
			href: '/admin/super/storage',
			icon: Database
		},
		{ label: () => m.components_admin_sidebar_system(), href: '/admin/super/system', icon: Server },
		{
			label: () => m.components_admin_sidebar_danger(),
			href: '/admin/super/danger',
			icon: AlertTriangle
		}
	];

	const session = authClient.useSession();
	const isSuperadmin = $derived($session.data?.user.role === 'superadmin');

	function isActive(href: string): boolean {
		if (href === '/admin') return page.url.pathname === '/admin';
		if (href === '/admin/super') return page.url.pathname === '/admin/super';
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="/admin" {...props}>
							{#if site.logoUrl}
								<img
									src={site.logoUrl}
									alt=""
									class="aspect-square size-8 rounded-lg object-contain"
								/>
							{:else}
								<div
									class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
								>
									<ShoppingCart class="size-4" />
								</div>
							{/if}
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">{site.storeName}</span>
								<span class="truncate text-xs text-muted-foreground"
									>{m.components_admin_sidebar_console()}</span
								>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>{m.components_admin_sidebar_store()}</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each mainNav as item (item.href)}
						{@const Icon = item.icon}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={item.label()}>
								{#snippet child({ props })}
									<a href={item.href} {...props}>
										<Icon />
										<span>{item.label()}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>

		{#if isSuperadmin}
			<Sidebar.Group>
				<Sidebar.GroupLabel>{m.components_admin_sidebar_superadmin()}</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each superNav as item (item.href)}
							{@const Icon = item.icon}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={item.label()}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<Icon />
											<span>{item.label()}</span>
										</a>
									{/snippet}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		{/if}
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton tooltipContent={m.components_admin_sidebar_back_to_store()}>
					{#snippet child({ props })}
						<a href="/" {...props}>
							<ShoppingCart />
							<span>{m.components_admin_sidebar_back_to_store()}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
