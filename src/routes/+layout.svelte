<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();

	if (import.meta.env.DEV) {
		window.addEventListener(
			'click',
			(e) => {
				const target = e.target as Element | null;
				if (!target?.closest?.('#svelte-inspector-toggle')) return;
				e.preventDefault();
				e.stopImmediatePropagation();
				document.body.dispatchEvent(
					new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', altKey: true, bubbles: true })
				);
			},
			true
		);
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="commerce-app min-h-screen w-full">
	{@render children()}
</div>
