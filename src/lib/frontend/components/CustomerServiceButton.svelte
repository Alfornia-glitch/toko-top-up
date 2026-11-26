<script lang="ts">
	import { Headset } from '@lucide/svelte';
	import { Button } from '#lib/frontend/components/ui/button/index.ts';
	import { site } from '#lib/frontend/modules/commerce/site.svelte.ts';

	const phone = $derived(site.contact.phone.replace(/\D/g, ''));
	const href = $derived(phone ? `https://wa.me/${phone}` : '/account/support-tickets');
</script>

<Button
	{href}
	class="fixed right-4 bottom-0 z-50 h-10 rounded-t-xl rounded-b-none text-xs"
	data-name="Customer Service"
>
	<Headset />
	CUSTOMER SERVICE
</Button>
