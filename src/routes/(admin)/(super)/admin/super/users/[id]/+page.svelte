<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ArrowLeft, Ban, LoaderCircle, LogIn, RefreshCw, ShieldCheck } from '@lucide/svelte';
	import ConfirmDialog from '#lib/frontend/components/admin/ConfirmDialog.svelte';
	import StatusBadge from '#lib/frontend/components/admin/StatusBadge.svelte';
	import * as AlertDialog from '#lib/frontend/components/ui/alert-dialog/index.ts';
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import * as Card from '#lib/frontend/components/ui/card/index.ts';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import * as Select from '#lib/frontend/components/ui/select/index.ts';
	import * as Table from '#lib/frontend/components/ui/table/index.ts';
	import { Textarea } from '#lib/frontend/components/ui/textarea/index.ts';
	import { authErrorMessage, authClient } from '#frontend/modules/auth/index.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { errorMessage } from '#lib/frontend/i18n/index.ts';
	import { roleLabel } from '#lib/frontend/i18n/labels.ts';
	import { formatDateTime } from '#lib/frontend/modules/commerce/format.ts';

	type SessionRow = {
		id: string;
		ipAddress: string | null;
		userAgent: string | null;
		createdAt: string;
		expiresAt: string;
		impersonatedBy: string | null;
	};

	type UserDetail = {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
		role: string;
		banned: boolean;
		banReason: string | null;
		banExpires: string | null;
		emailVerified: boolean;
		createdAt: string;
		updatedAt: string;
		sessions: SessionRow[];
		orderCount: number;
	};

	const roles = ['customer', 'admin', 'superadmin'];

	let profile = $state<UserDetail | null>(null);
	let loading = $state(true);
	let error = $state('');
	let actionError = $state('');
	let notice = $state('');

	let role = $state('');
	let savingRole = $state(false);

	let banOpen = $state(false);
	let banReason = $state('');
	let banExpires = $state('');
	let banError = $state('');
	let banning = $state(false);
	let unbanning = $state(false);

	let impersonating = $state(false);

	let revokeOpen = $state(false);
	let revokeTarget = $state<SessionRow | null>(null);

	onMount(() => {
		void load(page.params.id);
	});

	async function load(id: string | undefined) {
		if (!id) {
			error = m.admin_super_user_not_found();
			loading = false;
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/super/users/${id}`);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			profile = payload.data as UserDetail;
			role = profile.role;
		} catch (err) {
			error = errorMessage(err, 'admin_super_user_load_failed');
		} finally {
			loading = false;
		}
	}

	async function saveRole(nextRole: string) {
		if (!profile || savingRole || nextRole === profile.role) return;

		savingRole = true;
		actionError = '';
		notice = '';
		role = nextRole;

		try {
			const response = await fetch(`/api/admin/super/users/${profile.id}/role`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ role: nextRole })
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			notice = m.admin_super_user_role_updated();
			await load(profile.id);
		} catch (err) {
			role = profile.role;
			actionError = errorMessage(err, 'admin_super_user_role_update_failed');
		} finally {
			savingRole = false;
		}
	}

	function openBan() {
		banReason = '';
		banExpires = '';
		banError = '';
		banOpen = true;
	}

	async function submitBan() {
		if (!profile) return;

		banError = '';

		if (!banReason.trim()) {
			banError = m.admin_super_user_ban_reason_required();
			return;
		}

		banning = true;
		actionError = '';
		notice = '';

		try {
			const response = await fetch(`/api/admin/super/users/${profile.id}/ban`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					reason: banReason.trim(),
					expiresAt: banExpires ? new Date(banExpires).toISOString() : null
				})
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			banOpen = false;
			notice = m.admin_super_user_banned();
			await load(profile.id);
		} catch (err) {
			banError = errorMessage(err, 'admin_super_user_ban_failed');
		} finally {
			banning = false;
		}
	}

	async function unban() {
		if (!profile) return;

		unbanning = true;
		actionError = '';
		notice = '';

		try {
			const response = await fetch(`/api/admin/super/users/${profile.id}/ban`, {
				method: 'DELETE'
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			notice = m.admin_super_user_unbanned();
			await load(profile.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_super_user_unban_failed');
		} finally {
			unbanning = false;
		}
	}

	async function impersonate() {
		if (!profile) return;

		impersonating = true;
		actionError = '';
		notice = '';

		try {
			await fetch(`/api/admin/super/users/${profile.id}/impersonate-audit`, { method: 'POST' });
			const result = await authClient.admin.impersonateUser({ userId: profile.id });

			if (result.error) {
				throw new Error(authErrorMessage(result.error, m.admin_super_user_impersonate_failed()));
			}

			await goto('/');
		} catch (err) {
			actionError = errorMessage(err, 'admin_super_user_impersonate_failed');
		} finally {
			impersonating = false;
		}
	}

	function openRevoke(session: SessionRow) {
		revokeTarget = session;
		revokeOpen = true;
	}

	async function revokeSession() {
		if (!profile || !revokeTarget) return;

		actionError = '';
		notice = '';

		try {
			const response = await fetch(
				`/api/admin/super/users/${profile.id}/sessions?sessionId=${encodeURIComponent(revokeTarget.id)}`,
				{ method: 'DELETE' }
			);
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) throw payload;

			notice = m.admin_super_user_session_revoked();
			await load(profile.id);
		} catch (err) {
			actionError = errorMessage(err, 'admin_super_user_revoke_failed');
		} finally {
			revokeTarget = null;
		}
	}

	function roleVariant(value: string): BadgeVariant {
		if (value === 'superadmin') return 'default';
		if (value === 'admin') return 'secondary';
		return 'outline';
	}

	function formatDate(value: string | null) {
		return formatDateTime(value) || m.common_dash();
	}
</script>

{#if loading}
	<div class="flex h-64 items-center justify-center">
		<LoaderCircle class="size-6 animate-spin text-muted-foreground" />
	</div>
{:else if error}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-destructive">{error}</p>
			<div class="flex justify-center gap-2">
				<Button variant="outline" href="/admin/super/users">
					<ArrowLeft class="size-4" />
					{m.admin_super_user_back()}
				</Button>
				<Button onclick={() => void load(page.params.id)}>{m.common_retry()}</Button>
			</div>
		</Card.Content>
	</Card.Root>
{:else if profile}
	<div class="space-y-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="space-y-2">
				<Button variant="ghost" size="sm" href="/admin/super/users">
					<ArrowLeft class="size-4" />
					{m.admin_super_user_back()}
				</Button>
				<div class="flex flex-wrap items-center gap-2">
					<h1 class="text-2xl font-semibold tracking-tight">
						{profile.name ?? m.admin_super_unnamed_user()}
					</h1>
					<Badge variant={roleVariant(profile.role)}>{roleLabel(profile.role)}</Badge>
					<StatusBadge status={profile.banned ? 'banned' : 'active'} />
					{#if profile.emailVerified}
						<Badge variant="outline">
							<ShieldCheck class="size-3" />
							{m.admin_super_user_verified()}
						</Badge>
					{:else}
						<Badge variant="outline">{m.admin_super_user_unverified()}</Badge>
					{/if}
				</div>
				<p class="text-sm text-muted-foreground">{profile.email}</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button variant="outline" onclick={impersonate} disabled={impersonating || profile.banned}>
					{#if impersonating}
						<LoaderCircle class="size-4 animate-spin" />
						{m.admin_super_user_impersonating()}
					{:else}
						<LogIn class="size-4" />
						{m.admin_super_user_impersonate()}
					{/if}
				</Button>
				{#if profile.banned}
					<Button variant="outline" onclick={unban} disabled={unbanning}>
						{#if unbanning}
							<LoaderCircle class="size-4 animate-spin" />
							{m.admin_super_user_unbanning()}
						{:else}
							<RefreshCw class="size-4" />
							{m.admin_super_user_unban()}
						{/if}
					</Button>
				{:else}
					<Button variant="destructive" onclick={openBan}>
						<Ban class="size-4" />
						{m.admin_super_user_ban()}
					</Button>
				{/if}
			</div>
		</div>

		{#if actionError}
			<div
				class="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
				role="alert"
			>
				{actionError}
			</div>
		{/if}

		{#if notice}
			<div class="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">{notice}</div>
		{/if}

		<div class="grid gap-4 lg:grid-cols-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>{m.common_profile()}</Card.Title>
					<Card.Description>{m.admin_super_user_profile_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<dl class="grid gap-3 text-sm sm:grid-cols-2">
						<div class="space-y-1">
							<dt class="text-muted-foreground">{m.admin_super_user_id()}</dt>
							<dd class="font-mono text-xs break-all">{profile.id}</dd>
						</div>
						<div class="space-y-1">
							<dt class="text-muted-foreground">{m.common_orders()}</dt>
							<dd class="font-medium">{profile.orderCount}</dd>
						</div>
						<div class="space-y-1">
							<dt class="text-muted-foreground">{m.admin_super_col_joined()}</dt>
							<dd>{formatDate(profile.createdAt)}</dd>
						</div>
						<div class="space-y-1">
							<dt class="text-muted-foreground">{m.admin_super_col_updated()}</dt>
							<dd>{formatDate(profile.updatedAt)}</dd>
						</div>
					</dl>

					<Field.Field>
						<Field.Label for="user-role">{m.admin_super_col_role()}</Field.Label>
						<Select.Root type="single" value={role} onValueChange={saveRole}>
							<Select.Trigger id="user-role" class="w-full sm:w-64">
								<Select.Value placeholder={m.admin_super_user_select_role()} />
							</Select.Trigger>
							<Select.Content>
								{#each roles as option (option)}
									<Select.Item value={option} label={roleLabel(option)}>
										{roleLabel(option)}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
						<Field.Description>
							{savingRole
								? m.admin_super_user_saving_role()
								: m.admin_super_user_changes_immediate()}
						</Field.Description>
					</Field.Field>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.admin_super_user_moderation_title()}</Card.Title>
					<Card.Description>{m.admin_super_user_moderation_desc()}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					<div class="flex items-center justify-between gap-3">
						<span class="text-muted-foreground">{m.common_status()}</span>
						<StatusBadge status={profile.banned ? 'banned' : 'active'} />
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-muted-foreground">{m.admin_super_user_reason()}</span>
						<span class="text-right">{profile.banReason ?? m.common_dash()}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-muted-foreground">{m.admin_super_user_expires()}</span>
						<span class="text-right">{formatDate(profile.banExpires)}</span>
					</div>
					<div class="flex items-center justify-between gap-3">
						<span class="text-muted-foreground">{m.admin_super_user_active_sessions()}</span>
						<span class="font-medium">{profile.sessions.length}</span>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.admin_super_user_sessions_title()}</Card.Title>
				<Card.Description>{m.admin_super_user_sessions_desc()}</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if profile.sessions.length === 0}
					<p class="text-sm text-muted-foreground">{m.admin_super_user_no_sessions()}</p>
				{:else}
					<div class="overflow-hidden rounded-lg border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>{m.admin_super_user_col_session()}</Table.Head>
									<Table.Head>{m.admin_super_audit_ip()}</Table.Head>
									<Table.Head>{m.admin_super_audit_user_agent()}</Table.Head>
									<Table.Head>{m.admin_super_user_col_created()}</Table.Head>
									<Table.Head>{m.admin_super_user_expires()}</Table.Head>
									<Table.Head class="text-right">{m.common_actions()}</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each profile.sessions as session (session.id)}
									<Table.Row>
										<Table.Cell>
											<code class="text-xs text-muted-foreground">{session.id}</code>
											{#if session.impersonatedBy}
												<Badge variant="secondary" class="ml-2">
													{m.admin_super_user_impersonated()}
												</Badge>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{session.ipAddress ?? m.common_dash()}
										</Table.Cell>
										<Table.Cell class="max-w-64 truncate text-muted-foreground">
											{session.userAgent ?? m.common_dash()}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDate(session.createdAt)}
										</Table.Cell>
										<Table.Cell class="text-muted-foreground">
											{formatDate(session.expiresAt)}
										</Table.Cell>
										<Table.Cell class="text-right">
											<Button variant="outline" size="sm" onclick={() => openRevoke(session)}>
												{m.admin_super_user_revoke()}
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<AlertDialog.Root bind:open={banOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>{m.admin_super_user_ban()}</AlertDialog.Title>
				<AlertDialog.Description>
					{m.admin_super_user_ban_desc({ email: profile.email })}
				</AlertDialog.Description>
			</AlertDialog.Header>

			<div class="grid gap-3">
				<Field.Field>
					<Field.Label for="ban-reason">{m.admin_super_user_reason()}</Field.Label>
					<Textarea
						id="ban-reason"
						bind:value={banReason}
						placeholder={m.admin_super_user_ban_reason_placeholder()}
						rows={3}
					/>
				</Field.Field>

				<Field.Field>
					<Field.Label for="ban-expires">{m.admin_super_user_expires()}</Field.Label>
					<Input id="ban-expires" type="datetime-local" bind:value={banExpires} />
					<Field.Description>{m.admin_super_user_ban_expires_hint()}</Field.Description>
				</Field.Field>

				{#if banError}
					<Field.Error>{banError}</Field.Error>
				{/if}
			</div>

			<AlertDialog.Footer>
				<AlertDialog.Cancel disabled={banning}>{m.common_cancel()}</AlertDialog.Cancel>
				<Button
					type="button"
					variant="destructive"
					onclick={submitBan}
					disabled={banning || !banReason.trim()}
				>
					{banning ? m.admin_super_user_banning() : m.admin_super_user_ban()}
				</Button>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{:else}
	<Card.Root>
		<Card.Content class="space-y-4 py-10 text-center">
			<p class="text-sm text-muted-foreground">
				{m.admin_super_user_not_found_card()}
			</p>
			<Button href="/admin/super/users">{m.admin_super_user_back()}</Button>
		</Card.Content>
	</Card.Root>
{/if}

<ConfirmDialog
	bind:open={revokeOpen}
	title={m.admin_super_user_revoke_title()}
	description={m.admin_super_user_revoke_desc()}
	confirmLabel={m.admin_super_user_revoke()}
	cancelLabel={m.common_cancel()}
	destructive
	onConfirm={revokeSession}
/>
