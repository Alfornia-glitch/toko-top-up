<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import MailCheck from '@lucide/svelte/icons/mail-check';
	import AuthShell from '#lib/frontend/components/auth/AuthShell.svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { Spinner } from '#lib/frontend/components/ui/spinner/index.ts';
	import { authClient, authErrorMessage } from '#frontend/modules/auth/index.ts';

	const session = authClient.useSession();
	const email = $derived($session.data?.user.email);
	const description = $derived(
		email ? m.auth_verify_description_email({ email }) : m.auth_verify_description()
	);

	let resent = $state(false);
	let loading = $state(false);
	let error = $state('');

	async function handleResend() {
		if (!email) return;

		error = '';
		loading = true;

		try {
			const { error: authError } = await authClient.sendVerificationEmail({
				email,
				callbackURL: '/'
			});

			if (authError) {
				error = authErrorMessage(authError);
				return;
			}

			resent = true;
		} catch (err) {
			error = authErrorMessage(err);
		} finally {
			loading = false;
		}
	}
</script>

<AuthShell showLogo={false} title={m.auth_verify_title()} {description}>
	{#snippet icon()}
		<div class="flex size-12 items-center justify-center rounded-full bg-muted text-foreground">
			<MailCheck class="size-6" />
		</div>
	{/snippet}

	<div class="grid gap-6">
		<Button type="button" class="w-full" onclick={() => goto('/')}>{m.auth_verify_skip()}</Button>
		<p class="text-center text-sm text-muted-foreground">
			{m.auth_no_mail()}
			<button
				type="button"
				class="font-medium text-foreground underline-offset-4 hover:underline disabled:opacity-50"
				disabled={!email || loading}
				onclick={handleResend}
			>
				{#if loading}
					<Spinner class="mr-1 inline size-3" />
				{/if}
				{resent ? m.auth_verify_sent() : m.auth_resend()}
			</button>
		</p>
		{#if error}
			<p class="text-center text-sm text-destructive" role="alert">{error}</p>
		{/if}
	</div>
</AuthShell>
