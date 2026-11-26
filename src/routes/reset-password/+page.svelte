<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AuthShell from '#lib/frontend/components/auth/AuthShell.svelte';
	import PasswordField from '#lib/frontend/components/auth/PasswordField.svelte';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { authClient, authErrorMessage } from '#frontend/modules/auth/index.ts';

	const token = $derived(page.url.searchParams.get('token'));

	let password = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		if (!token) {
			error = m.auth_reset_invalid_link();
			return;
		}

		if (password.length < 8) {
			error = m.auth_password_too_short();
			return;
		}

		if (password !== confirmPassword) {
			error = m.auth_password_mismatch();
			return;
		}

		loading = true;

		try {
			const { error: authError } = await authClient.resetPassword({
				newPassword: password,
				token
			});

			if (authError) {
				error = authErrorMessage(authError);
				return;
			}

			await goto('/login', { replaceState: true });
		} catch (err) {
			error = authErrorMessage(err);
		} finally {
			loading = false;
		}
	}
</script>

<AuthShell title={m.auth_reset_title()} description={m.auth_reset_description()}>
	{#if token}
		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<PasswordField
					id="password"
					label={m.auth_reset_new_password()}
					bind:value={password}
					placeholder={m.auth_reset_new_password_placeholder()}
					autocomplete="new-password"
					hint={m.auth_password_hint()}
				/>
				<PasswordField
					id="confirm-password"
					label={m.auth_confirm_password()}
					bind:value={confirmPassword}
					placeholder={m.auth_reset_confirm_placeholder()}
					autocomplete="new-password"
				/>
			</Field.Group>
			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}
			<div class="grid gap-2">
				<Button type="submit" class="w-full" disabled={loading}>
					{#if loading}
						<Spinner />
					{/if}
					{m.common_save_changes()}
				</Button>
				<Button type="button" variant="outline" class="w-full" onclick={() => goto('/login')}>
					{m.auth_back_to_login()}
				</Button>
			</div>
		</form>
	{:else}
		<div class="grid gap-4">
			<p class="text-sm text-muted-foreground">
				{m.auth_reset_invalid_link_long()}
			</p>
			<div class="grid gap-2">
				<Button href="/forgot-password" class="w-full">{m.auth_forgot_title()}</Button>
				<Button type="button" variant="outline" class="w-full" onclick={() => goto('/login')}>
					{m.auth_back_to_login()}
				</Button>
			</div>
		</div>
	{/if}
</AuthShell>
