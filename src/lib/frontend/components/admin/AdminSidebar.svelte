<script lang="ts">
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
		ShoppingCart,
		Star,
		Tag,
		TicketPercent,
		UserCog,
		Users
	} from '@lucide/svelte';
	import * as Sidebar from '#lib/frontend/components/ui/sidebar/index.ts';
	import { authClient } from '#frontend/modules/auth/index.ts';

	type NavItem = { label: string; href: string; icon: Component<{ class?: string }> };

	const mainNav: NavItem[] = [
		{ label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
		{ label: 'Products', href: '/admin/products', icon: Package },
		{ label: 'Categories', href: '/admin/categories', icon: FolderTree },
		{ label: 'Brands', href: '/admin/brands', icon: Tag },
		{ label: 'Inventory', href: '/admin/inventory', icon: Boxes },
		{ label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
		{ label: 'Returns', href: '/admin/returns', icon: RotateCcw },
		{ label: 'Customers', href: '/admin/customers', icon: Users },
		{ label: 'Reviews', href: '/admin/reviews', icon: Star },
		{ label: 'Coupons', href: '/admin/coupons', icon: TicketPercent },
		{ label: 'Gift Cards', href: '/admin/gift-cards', icon: Gift },
		{ label: 'Support', href: '/admin/support', icon: LifeBuoy },
		{ label: 'Newsletter', href: '/admin/newsletter', icon: Mail },
		{ label: 'Content', href: '/admin/content', icon: ImageIcon },
		{ label: 'Media', href: '/admin/media', icon: ImageIcon },
		{ label: 'Reports', href: '/admin/reports', icon: BarChart3 }
	];

	const superNav: NavItem[] = [
		{ label: 'Overview', href: '/admin/super', icon: Shield },
		{ label: 'Users', href: '/admin/super/users', icon: Users },
		{ label: 'Admins', href: '/admin/super/admins', icon: UserCog },
		{ label: 'Roles', href: '/admin/super/roles', icon: KeyRound },
		{ label: 'Audit Logs', href: '/admin/super/audit-logs', icon: ScrollText },
		{ label: 'Settings', href: '/admin/super/settings', icon: Settings },
		{ label: 'Integrations', href: '/admin/super/integrations', icon: Plug },
		{ label: 'Storage', href: '/admin/super/storage', icon: Database },
		{ label: 'System', href: '/admin/super/system', icon: Server },
		{ label: 'Danger Zone', href: '/admin/super/danger', icon: AlertTriangle }
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
							<div
								class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
							>
								<ShoppingCart class="size-4" />
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">Commerce</span>
								<span class="truncate text-xs text-muted-foreground">Admin console</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Store</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each mainNav as item (item.href)}
						{@const Icon = item.icon}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={item.label}>
								{#snippet child({ props })}
									<a href={item.href} {...props}>
										<Icon />
										<span>{item.label}</span>
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
				<Sidebar.GroupLabel>Superadmin</Sidebar.GroupLabel>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each superNav as item (item.href)}
							{@const Icon = item.icon}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton isActive={isActive(item.href)} tooltipContent={item.label}>
									{#snippet child({ props })}
										<a href={item.href} {...props}>
											<Icon />
											<span>{item.label}</span>
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
				<Sidebar.MenuButton tooltipContent="Back to store">
					{#snippet child({ props })}
						<a href="/" {...props}>
							<ShoppingCart />
							<span>Back to store</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
