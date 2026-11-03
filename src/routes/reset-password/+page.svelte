<script lang="ts">
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
			error = 'This reset link is invalid or has expired. Please request a new one.';
			return;
		}

		if (password.length < 8) {
			error = 'Your password must be at least 8 characters long.';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
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

<AuthShell
	title="Reset password"
	description="Time for a fresh start! Go ahead and set a new password."
>
	{#if token}
		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<PasswordField
					id="password"
					label="New password"
					bind:value={password}
					placeholder="Enter a new password"
					autocomplete="new-password"
					hint="Use at least 8 characters."
				/>
				<PasswordField
					id="confirm-password"
					label="Confirm password"
					bind:value={confirmPassword}
					placeholder="Repeat your new password"
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
					Save changes
				</Button>
				<Button type="button" variant="outline" class="w-full" onclick={() => goto('/login')}>
					Back to login
				</Button>
			</div>
		</form>
	{:else}
		<div class="grid gap-4">
			<p class="text-sm text-muted-foreground">
				This reset link is invalid or has expired. Please request a new password reset link.
			</p>
			<div class="grid gap-2">
				<Button href="/forgot-password" class="w-full">Forgot password?</Button>
				<Button type="button" variant="outline" class="w-full" onclick={() => goto('/login')}>
					Back to login
				</Button>
			</div>
		</div>
	{/if}
</AuthShell>
