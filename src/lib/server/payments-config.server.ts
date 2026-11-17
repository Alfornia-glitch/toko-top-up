import { PAYMENT_PROOF_DIR, PAYMENT_WINDOW_MINUTES, QRIS_IMAGE_URL } from '$app/env/private';
import { PAYMENT_WINDOW_MINUTES as DEFAULT_WINDOW } from '#modules/payments/server.ts';
import type { PaymentsConfig } from '#modules/payments/server.ts';

export function loadPaymentsConfig(): PaymentsConfig & { proofDirectory: string } {
	const minutes = Number(PAYMENT_WINDOW_MINUTES);
	return {
		qrisImageUrl: QRIS_IMAGE_URL || null,
		windowMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_WINDOW,
		proofDirectory: PAYMENT_PROOF_DIR
	};
}
