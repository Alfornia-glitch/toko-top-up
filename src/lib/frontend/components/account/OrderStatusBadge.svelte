<script lang="ts">
	import { Badge, type BadgeVariant } from '#lib/frontend/components/ui/badge/index.ts';
	import {
		ORDER_STATUS_LABELS,
		PAYMENT_STATUS_LABELS,
		RETURN_STATUS_LABELS,
		TICKET_STATUS_LABELS,
		statusLabel
	} from '#lib/frontend/content/status.ts';

	type Kind = 'order' | 'payment' | 'fulfillment' | 'return' | 'ticket';

	let {
		status,
		kind = 'order'
	}: {
		status: string;
		kind?: Kind;
	} = $props();

	const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
		pending: 'Pending',
		processing: 'Processing',
		shipped: 'Shipped',
		delivered: 'Delivered',
		cancelled: 'Cancelled',
		returned: 'Returned'
	};

	const SUCCESS_STATUSES = new Set(['paid', 'delivered', 'completed', 'resolved', 'approved']);
	const WARNING_STATUSES = new Set(['pending', 'processing', 'in_progress']);
	const FAILURE_STATUSES = new Set(['failed', 'cancelled', 'rejected', 'refunded']);

	const labels = $derived.by(() => {
		if (kind === 'payment') return PAYMENT_STATUS_LABELS;
		if (kind === 'return') return RETURN_STATUS_LABELS;
		if (kind === 'ticket') return TICKET_STATUS_LABELS;
		if (kind === 'fulfillment') return FULFILLMENT_STATUS_LABELS;
		return ORDER_STATUS_LABELS;
	});

	const label = $derived(statusLabel(labels, status));

	const variant = $derived.by((): BadgeVariant => {
		if (SUCCESS_STATUSES.has(status)) return 'outline';
		if (FAILURE_STATUSES.has(status)) return 'destructive';
		if (WARNING_STATUSES.has(status)) return 'secondary';
		return 'outline';
	});

	const badgeClass = $derived(
		SUCCESS_STATUSES.has(status) ? 'bg-emerald-600 text-white' : undefined
	);
</script>

<Badge {variant} class={badgeClass}>{label}</Badge>
