<script lang="ts">
	import { page } from '$app/state';
	import { LogOut, Search } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import LanguageSwitcher from '#lib/frontend/components/LanguageSwitcher.svelte';
	import * as Sidebar from '#lib/frontend/components/ui/sidebar/index.ts';
	import * as Breadcrumb from '#lib/frontend/components/ui/breadcrumb/index.ts';
	import * as DropdownMenu from '#lib/frontend/components/ui/dropdown-menu/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import UserAvatar from '#lib/frontend/components/UserAvatar.svelte';
	import { authClient, signOutUser } from '#frontend/modules/auth/index.ts';

	const session = authClient.useSession();
	const user = $derived($session.data?.user);

	const displayName = $derived(user?.name || user?.email || m.admin_header_fallback_name());

	const labels: Record<string, () => string> = {
		admin: () => m.admin_header_crumb_admin(),
		super: () => m.admin_header_crumb_super(),
		'gift-cards': () => m.admin_header_crumb_gift_cards(),
		'audit-logs': () => m.admin_header_crumb_audit_logs(),
		new: () => m.admin_header_crumb_new()
	};

	const crumbs = $derived.by(() =>
		page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, index, segments) => ({
				label:
					labels[segment]?.() ?? segment.replaceAll('-', ' ').replace(/^./, (c) => c.toUpperCase()),
				href: `/${segments.slice(0, index + 1).join('/')}`
			}))
	);
</script>

<header class="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-4">
	<Sidebar.Trigger />

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
		<LanguageSwitcher />
		<div class="relative hidden sm:block">
			<Search class="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				class="w-56 pl-8"
				placeholder={m.admin_header_search_placeholder()}
				aria-label={m.admin_header_search_label()}
			/>
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
					<div class="truncate font-medium">{user?.name ?? m.admin_header_fallback_name()}</div>
					<div class="truncate text-xs text-muted-foreground">{user?.email ?? ''}</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item variant="destructive" onclick={() => void signOutUser('/login')}>
					<LogOut />
					{m.admin_header_sign_out()}
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>
