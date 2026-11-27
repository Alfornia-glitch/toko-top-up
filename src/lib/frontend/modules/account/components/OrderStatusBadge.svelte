<script lang="ts">
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import { statusLabel } from '#lib/frontend/i18n/labels.ts';

	type Kind = 'order' | 'payment' | 'fulfillment' | 'return' | 'ticket';

	let {
		status,
		kind = 'order'
	}: {
		status: string;
		kind?: Kind;
	} = $props();

	const SUCCESS_STATUSES = new Set(['paid', 'delivered', 'completed', 'resolved', 'approved']);
	const WARNING_STATUSES = new Set(['pending', 'processing', 'in_progress']);
	const FAILURE_STATUSES = new Set(['failed', 'cancelled', 'rejected', 'refunded']);

	const label = $derived(statusLabel(kind, status));

	const variant = $derived.by((): BadgeVariant => {
		if (SUCCESS_STATUSES.has(status)) return 'outline';
		if (FAILURE_STATUSES.has(status)) return 'destructive';
		if (WARNING_STATUSES.has(status)) return 'secondary';
		return 'outline';
	});

	const badgeClass = $derived(
		SUCCESS_STATUSES.has(status) ? 'bg-success text-success-foreground' : undefined
	);
</script>

<Badge {variant} class={badgeClass}>{label}</Badge>
