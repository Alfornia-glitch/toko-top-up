export type PaymentStatus =
	'pending_payment' | 'awaiting_verification' | 'paid' | 'rejected' | 'expired';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export const REJECT_REASONS = [
	'wrong_amount',
	'unreadable',
	'no_matching_mutation',
	'other'
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

/** How long a customer has to pay and upload proof. */
export const PAYMENT_WINDOW_MINUTES = 30;
export const UNIQUE_CODE_MIN = 1;
export const UNIQUE_CODE_MAX = 999;
export const UNIQUE_CODE_ATTEMPTS = 25;

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PROOF_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ProofMime = (typeof PROOF_MIME_TYPES)[number];
export const PROOF_UPLOADS_PER_HOUR = 5;

export interface PaymentRecord {
	id: string;
	orderId: string;
	userId: string;
	baseAmount: number;
	uniqueCode: number;
	totalAmount: number;
	status: PaymentStatus;
	expiresAt: Date;
	paidAt: Date | null;
	createdAt: Date;
}

export interface PaymentProof {
	id: string;
	paymentId: string;
	filePath: string;
	fileHash: string;
	uploadedAt: Date;
	reviewStatus: ReviewStatus;
	reviewedBy: string | null;
	reviewedAt: Date | null;
	rejectReason: string | null;
	rejectNote: string | null;
}

export interface PaymentAuditEntry {
	id: string;
	paymentId: string;
	actorId: string | null;
	action: string;
	note: string | null;
	createdAt: Date;
}

export interface QueueQuery {
	status?: PaymentStatus | undefined;
	page: number;
	pageSize: number;
}

export interface QueueRow {
	payment: PaymentRecord;
	/** Latest proof upload time, when any. */
	uploadedAt: Date | null;
}

/** Customer-facing view: never exposes file paths or hashes. */
export interface CustomerPayment {
	id: string;
	orderId: string;
	baseAmount: number;
	uniqueCode: number;
	totalAmount: number;
	status: PaymentStatus;
	expiresAt: Date;
	paidAt: Date | null;
	qrisImageUrl: string | null;
	rejectReason: string | null;
	rejectNote: string | null;
	hasProof: boolean;
}

export interface AdminPaymentDetail {
	payment: PaymentRecord;
	customer: { id: string; name: string | null; email: string | null };
	order: { orderNumber: string; status: string; currency: string };
	proofs: Array<Omit<PaymentProof, 'filePath' | 'fileHash'>>;
	audit: PaymentAuditEntry[];
}

export interface AdminQueueItem {
	id: string;
	orderId: string;
	orderNumber: string | null;
	userId: string;
	customerName: string | null;
	totalAmount: number;
	status: PaymentStatus;
	uploadedAt: Date | null;
	createdAt: Date;
}

export interface UploadedFile {
	name: string;
	size: number;
	bytes: Uint8Array;
}

export class DuplicateProofError extends Error {}
export class OpenAmountCollisionError extends Error {}

export interface PaymentsRepository {
	findPayment(id: string): Promise<PaymentRecord | null>;
	findPaymentByOrder(orderId: string): Promise<PaymentRecord | null>;
	listQueue(query: QueueQuery): Promise<{ data: QueueRow[]; total: number }>;
	listProofs(paymentId: string): Promise<PaymentProof[]>;
	latestProof(paymentId: string): Promise<PaymentProof | null>;
	findProof(id: string): Promise<PaymentProof | null>;
	hashExists(hash: string): Promise<boolean>;
	countProofsSince(paymentId: string, since: Date): Promise<number>;
	listAudit(paymentId: string): Promise<PaymentAuditEntry[]>;
	/** Throws OpenAmountCollisionError when another open payment has the same total. */
	insertPayment(payment: PaymentRecord, audit: PaymentAuditEntry): Promise<void>;
	/** Atomic: stores the proof and moves the payment to awaiting_verification. Throws DuplicateProofError. */
	attachProof(proof: PaymentProof, audit: PaymentAuditEntry, now: Date): Promise<void>;
	/** Atomic: approves the proof and marks the payment paid. Returns false when it was not awaiting verification. */
	approve(
		paymentId: string,
		reviewer: string,
		now: Date,
		audit: PaymentAuditEntry
	): Promise<boolean>;
	/** Atomic: rejects the proof and the payment. Returns false when it was not awaiting verification. */
	reject(
		paymentId: string,
		reviewer: string,
		reason: RejectReason,
		note: string | null,
		now: Date,
		audit: PaymentAuditEntry
	): Promise<boolean>;
	/** Marks a still-unpaid payment expired. Returns false when it was not eligible. */
	expire(paymentId: string, now: Date, audit: PaymentAuditEntry): Promise<boolean>;
	listDueForExpiry(now: Date, limit: number): Promise<PaymentRecord[]>;
}

export interface PaymentsConfig {
	qrisImageUrl: string | null;
	windowMinutes: number;
}

/** Stores proof images privately; the service never learns a public URL. */
export interface ProofStorage {
	save(name: string, bytes: Uint8Array): Promise<string>;
	read(path: string): Promise<Uint8Array>;
}
