<script lang="ts">
	import { page } from '$app/state';
	import { LogOut, Search } from '@lucide/svelte';
	import * as Sidebar from '#lib/frontend/components/ui/sidebar/index.ts';
	import * as Breadcrumb from '#lib/frontend/components/ui/breadcrumb/index.ts';
	import * as DropdownMenu from '#lib/frontend/components/ui/dropdown-menu/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Separator } from '#lib/frontend/components/ui/separator/index.ts';
	import UserAvatar from '#lib/frontend/components/UserAvatar.svelte';
	import { authClient, signOutUser } from '#frontend/modules/auth/index.ts';

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	const displayName = $derived(user?.name || user?.email || 'Admin');

	const labels: Record<string, string> = {
		admin: 'Admin',
		super: 'Superadmin',
		'gift-cards': 'Gift cards',
		'audit-logs': 'Audit logs',
		new: 'New'
	};

	const crumbs = $derived.by(() =>
		page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, index, segments) => ({
				label:
					labels[segment] ?? segment.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase()),
				href: `/${segments.slice(0, index + 1).join('/')}`
			}))
	);
</script>

<header class="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-4">
	<Sidebar.Trigger />
	<Separator orientation="vertical" class="mr-1 data-[orientation=vertical]:h-4" />

	<Breadcrumb.Root>
		<Breadcrumb.List>
			{#each crumbs as crumb, index (crumb.href)}
				<Breadcrumb.Item>
					{#if index === crumbs.length - 1}
						<Breadcrumb.Page class="capitalize">{crumb.label}</Breadcrumb.Page>
					{:else}
						<Breadcrumb.Link href={crumb.href} class="capitalize">{crumb.label}</Breadcrumb.Link>
					{/if}
				</Breadcrumb.Item>
				{#if index < crumbs.length - 1}
					<Breadcrumb.Separator />
				{/if}
			{/each}
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<div class="ml-auto flex items-center gap-2">
		<div class="relative hidden sm:block">
			<Search class="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input class="w-56 pl-8" placeholder="Search…" aria-label="Search admin" />
		</div>

		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="flex items-center gap-2 rounded-lg p-1 hover:bg-muted"
					>
						<UserAvatar
							image={user?.image}
							name={user?.name}
							email={user?.email}
							class="size-8 rounded-full"
							labelClass="text-xs"
						/>
						<span class="hidden max-w-32 truncate text-sm md:inline">{displayName}</span>
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-56">
				<DropdownMenu.Label>
					<div class="truncate font-medium">{user?.name ?? 'Admin'}</div>
					<div class="truncate text-xs text-muted-foreground">{user?.email ?? ''}</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onclick={() => void signOutUser('/login')}>
					<LogOut />
					Sign out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>
