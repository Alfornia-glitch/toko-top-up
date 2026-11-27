<script lang="ts">
	import ThemeEditor from '#lib/frontend/components/admin/super/ThemeEditor.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.admin_super_theme_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.admin_super_theme_subtitle()}</p>
	</div>

	<ThemeEditor />
</div>
