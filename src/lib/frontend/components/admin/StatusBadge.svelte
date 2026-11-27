<script lang="ts">
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import { anyStatusLabel, statusLabel, type LabelKind } from '#lib/frontend/i18n/labels.ts';
	import { cn } from '#lib/frontend/utils.ts';

	let {
		status,
		kind,
		class: className
	}: { status: string; kind?: LabelKind; class?: string } = $props();

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

	const pending = new Set(['pending', 'processing', 'open', 'requested', 'awaiting_payment']);

	const variant = $derived<BadgeVariant>(
		destructive.has(status)
			? 'destructive'
			: positive.has(status)
				? 'success'
				: pending.has(status)
					? 'warning'
					: 'secondary'
	);
	const label = $derived(kind ? statusLabel(kind, status) : anyStatusLabel(status));
</script>

<Badge {variant} class={cn(className)}>{label}</Badge>
