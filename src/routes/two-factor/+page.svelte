<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import AuthShell from '#lib/frontend/components/auth/AuthShell.svelte';
	import * as Field from '#lib/frontend/components/ui/field/index.ts';
	import * as InputOTP from '#lib/frontend/components/ui/input-otp/index.ts';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';

	let code = $state('');
	let resent = $state(false);
	let error = $state('');

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		error = '';

		if (code.length !== 6) {
			error = m.auth_2fa_code_required();
			return;
		}

		goto('/');
	}
</script>

<AuthShell title={m.auth_2fa_title()} description={m.auth_2fa_description()}>
	<form class="grid gap-6" onsubmit={handleSubmit}>
		<Field.Field class="items-center">
			<Field.Label for="code">{m.auth_2fa_code_label()}</Field.Label>
			<InputOTP.Root inputId="code" maxlength={6} bind:value={code} class="justify-center" required>
				{#snippet children({ cells })}
					<InputOTP.Group>
						{#each cells.slice(0, 3) as cell, i (i)}
							<InputOTP.Slot {cell} />
						{/each}
					</InputOTP.Group>
					<InputOTP.Separator />
					<InputOTP.Group>
						{#each cells.slice(3) as cell, i (i + 3)}
							<InputOTP.Slot {cell} />
						{/each}
					</InputOTP.Group>
				{/snippet}
			</InputOTP.Root>
		</Field.Field>
		{#if error}
			<Field.Error>{error}</Field.Error>
		{/if}
		<Button type="submit" class="w-full">{m.auth_2fa_submit()}</Button>
	</form>
	<div class="mt-4 text-center text-sm text-muted-foreground">
		{m.auth_no_mail()}
		<button
			type="button"
			class="font-medium text-foreground underline-offset-4 hover:underline"
			onclick={() => (resent = !resent)}
		>
			{resent ? m.auth_2fa_code_sent() : m.auth_resend()}
		</button>
	</div>
</AuthShell>
