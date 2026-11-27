<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Headset } from '@lucide/svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';

	const phone = $derived(site.contact.phone.replace(/\D/g, ''));
	const href = $derived(phone ? `https://wa.me/${phone}` : '/account/support-tickets');
</script>

<Button
	{href}
	class="fixed bottom-0 left-4 z-50 h-10 rounded-t-xl rounded-b-none text-xs"
	data-name="Customer Service"
>
	<Headset />
	{m.components_customer_service()}
</Button>
