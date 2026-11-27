<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AuthShell from '#lib/frontend/components/auth/AuthShell.svelte';
	import PasswordField from '#lib/frontend/components/auth/PasswordField.svelte';
	import SocialButtons from '#lib/frontend/components/auth/SocialButtons.svelte';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import { Input } from '#lib/frontend/components/ui/input/index.ts';
	import { Checkbox } from '#lib/frontend/components/ui/checkbox/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { authClient, authErrorMessage, safeRedirect } from '#frontend/modules/auth/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';

	const session = authClient.useSession();
	const redirectTo = safeRedirect(page.url.searchParams.get('redirectTo'));

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let terms = $state(false);
	let loading = $state(false);
	let error = $state('');

	$effect(() => {
		if (!$session.isPending && $session.data) {
			void goto(redirectTo, { replaceState: true });
		}
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		if (password.length < 8) {
			error = m.auth_password_too_short();
			return;
		}

		if (password !== confirmPassword) {
			error = m.auth_password_mismatch();
			return;
		}

		if (!terms) {
			error = m.auth_signup_terms_required();
			return;
		}

		loading = true;

		try {
			const { error: authError } = await authClient.signUp.email({
				name,
				email,
				password
			});

			if (authError) {
				error = authErrorMessage(authError);
				return;
			}

			await goto(redirectTo, { replaceState: true });
		} catch (err) {
			error = authErrorMessage(err);
		} finally {
			loading = false;
		}
	}
</script>

<AuthShell
	title={m.auth_signup_title({ store: site.storeName })}
	description={m.auth_signup_description()}
>
	<div class="grid gap-6">
		<form class="grid gap-4" onsubmit={handleSubmit}>
			<Field.Group>
				<Field.Field>
					<Field.Label for="name">{m.common_full_name()}</Field.Label>
					<Input
						id="name"
						type="text"
						placeholder={m.auth_signup_name_placeholder()}
						autocomplete="name"
						bind:value={name}
						required
					/>
				</Field.Field>
				<Field.Field>
					<Field.Label for="email">{m.common_email()}</Field.Label>
					<Input
						id="email"
						type="email"
						placeholder={m.auth_email_placeholder()}
						autocomplete="email"
						bind:value={email}
						required
					/>
				</Field.Field>
				<PasswordField
					id="password"
					label={m.common_password()}
					bind:value={password}
					placeholder={m.auth_signup_password_placeholder()}
					autocomplete="new-password"
					hint={m.auth_password_hint()}
				/>
				<PasswordField
					id="confirm-password"
					label={m.auth_confirm_password()}
					bind:value={confirmPassword}
					placeholder={m.auth_signup_confirm_placeholder()}
					autocomplete="new-password"
				/>
			</Field.Group>
			{#if error}
				<Field.Error>{error}</Field.Error>
			{/if}
			<div class="flex items-start gap-2">
				<Checkbox id="terms" bind:checked={terms} class="mt-0.5" required />
				<Field.Label
					for="terms"
					class="items-start text-sm leading-snug font-normal text-muted-foreground"
				>
					{m.auth_signup_terms_prefix()}
					<span class="font-medium text-foreground">{m.auth_signup_terms_link()}</span>
				</Field.Label>
			</div>
			<Button type="submit" class="w-full" disabled={loading}>
				{#if loading}
					<Spinner />
					{m.auth_signup_submitting()}
				{:else}
					{m.auth_signup_submit()}
				{/if}
			</Button>
		</form>
		<SocialButtons callbackURL={redirectTo} />
	</div>

	{#snippet footer()}
		<p class="text-sm text-muted-foreground">
			{m.auth_signup_have_account()}
			<a href="/login" class="font-medium text-foreground underline-offset-4 hover:underline">
				{m.auth_signup_login()}
			</a>
		</p>
	{/snippet}
</AuthShell>
