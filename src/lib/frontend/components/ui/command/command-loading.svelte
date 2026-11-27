<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { Command as CommandPrimitive } from 'bits-ui';

	let { ref = $bindable(null), ...restProps }: CommandPrimitive.LoadingProps = $props();
</script>

<CommandPrimitive.Loading bind:ref aria-label={m.common_loading()} {...restProps} />
