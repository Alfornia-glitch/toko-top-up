<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthShell from '#lib/frontend/components/auth/AuthShell.svelte';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { authClient, authErrorMessage } from '#frontend/modules/auth/index.ts';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		sent = false;
		loading = true;

		try {
			const { error: authError } = await authClient.requestPasswordReset({
				email,
				redirectTo: `${window.location.origin}/reset-password`
			});

			if (authError) {
				error = authErrorMessage(authError);
				return;
			}

			sent = true;
		} catch (err) {
			error = authErrorMessage(err);
		} finally {
			loading = false;
		}
	}
</script>

<AuthShell
	title="Forgot password?"
	description="Enter your email and we’ll send you instructions to reset your password"
>
	<form class="grid gap-4" onsubmit={handleSubmit}>
		<Field.Group>
			<Field.Field>
				<Field.Label for="email">Email</Field.Label>
				<Input
					id="email"
					type="email"
					placeholder="john@example.com"
					autocomplete="email"
					bind:value={email}
					required
				/>
			</Field.Field>
		</Field.Group>
		{#if sent}
			<p class="text-sm text-muted-foreground" role="status">
				If an account exists for that email, a reset link is on its way. Check your inbox and follow
				the instructions.
			</p>
		{/if}
		{#if error}
			<Field.Error>{error}</Field.Error>
		{/if}
		<div class="grid gap-2">
			<Button type="submit" class="w-full" disabled={loading}>
				{#if loading}
					<Spinner />
				{/if}
				Reset password
			</Button>
			<Button type="button" variant="outline" class="w-full" onclick={() => goto('/login')}>
				Back to login
			</Button>
		</div>
	</form>
</AuthShell>
