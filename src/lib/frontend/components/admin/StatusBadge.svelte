<script lang="ts">
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import { cn } from '#lib/frontend/utils.ts';

	let { status, class: className }: { status: string; class?: string } = $props();

	const destructive = new Set([
		'cancelled',
		'failed',
		'rejected',
		'banned',
		'disabled',
		'expired',
		'archived'
	]);

	const positive = new Set([
		'active',
		'approved',
		'paid',
		'delivered',
		'completed',
		'succeeded',
		'subscribed',
		'resolved'
	]);

	const variant = $derived<BadgeVariant>(
		destructive.has(status) ? 'destructive' : positive.has(status) ? 'default' : 'secondary'
	);
	const label = $derived(status.replaceAll('_', ' '));
</script>

<Badge {variant} class={cn('capitalize', className)}>{label}</Badge>
