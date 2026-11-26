import { randomInt } from 'node:crypto';
import {
	ConflictError,
	NotFoundError,
	RateLimitedError,
	UnprocessableError,
	ValidationError,
	assertActor,
	assertPermission,
	err,
	newId,
	ok,
	systemClock,
	toAppError,
	unwrap,
	type Actor,
	type AppError,
	type Clock,
	type Result
} from '#shared';
import type { OrdersServices } from '#modules/orders/server.ts';
import {
	DuplicateProofError,
	OpenAmountCollisionError,
	PROOF_MAX_BYTES,
	PROOF_UPLOADS_PER_HOUR,
	REJECT_REASONS,
	UNIQUE_CODE_ATTEMPTS,
	UNIQUE_CODE_MAX,
	UNIQUE_CODE_MIN,
	type AdminPaymentDetail,
	type AdminQueueItem,
	type CustomerPayment,
	type PaymentAuditEntry,
	type PaymentRecord,
	type PaymentsConfig,
	type PaymentsRepository,
	type PaymentStatus,
	type ProofStorage,
	type RejectReason,
	type UploadedFile
} from '../domain/payments.ts';
import { EXTENSIONS, sha256, sniffMime, stripMetadata } from './proof-file.ts';

type Outcome<T> = Promise<Result<T, AppError>>;

/** Side effects on other modules when an unpaid payment lapses (cancel order, release stock). */
export interface PaymentsHooks {
	onExpired(orderId: string): Promise<void>;
}

export interface PaymentsDependencies {
	repository: PaymentsRepository;
	orders: Pick<OrdersServices, 'orders'>;
	storage: ProofStorage;
	config: PaymentsConfig;
	hooks: PaymentsHooks;
	clock?: Clock;
	/** Injectable for tests; returns an integer in [min, max]. */
	randomCode?: (min: number, max: number) => number;
}

export interface PaymentsService {
	/** Customer: opens a QRIS payment for one of their own pending orders. Idempotent per order. */
	createPayment(orderId: string, actor: Actor | null): Outcome<CustomerPayment>;
	/** Customer: by payment id or order id. Applies lazy expiry. */
	getMyPayment(ref: string, actor: Actor | null): Outcome<CustomerPayment>;
	uploadProof(paymentId: string, file: UploadedFile, actor: Actor | null): Outcome<CustomerPayment>;
	/** Owner or admin; returns the image bytes for an authenticated route to stream. */
	readProof(
		paymentId: string,
		proofId: string | null,
		actor: Actor | null
	): Outcome<{ bytes: Uint8Array; mime: string }>;

	listQueue(
		query: { status?: PaymentStatus | undefined; page: number; pageSize: number },
		actor: Actor | null
	): Outcome<{ data: AdminQueueItem[]; page: number; pageSize: number; total: number }>;
	getAdminDetail(paymentId: string, actor: Actor | null): Outcome<AdminPaymentDetail>;
	approve(paymentId: string, actor: Actor | null): Outcome<CustomerPayment>;
	reject(
		paymentId: string,
		input: { reason: string; note?: string | null | undefined },
		actor: Actor | null
	): Outcome<CustomerPayment>;

	/**
	 * GATEWAY WEBHOOK EXTENSION POINT.
	 * A payment gateway webhook (after verifying its signature and amount) should call this with
	 * `actorId = null`. It is the same atomic, idempotent path the admin approval uses, so the
	 * order model and fulfilment do not change when a gateway replaces manual verification.
	 */
	markPaid(paymentId: string, actorId: string | null): Outcome<PaymentRecord>;

	/** Expires every lapsed unpaid payment. Run from a scheduled job; reads also expire lazily. */
	expireDue(limit?: number): Outcome<{ expired: number }>;
}

const OPEN: PaymentStatus[] = ['pending_payment', 'rejected'];
const IMAGE_MIME: Record<string, string> = {
	jpg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp'
};

export function createPaymentsService(deps: PaymentsDependencies): PaymentsService {
	const { repository, orders, storage, config, hooks } = deps;
	const clock = deps.clock ?? systemClock;
	const randomCode = deps.randomCode ?? ((min, max) => randomInt(min, max + 1));
	const windowMs = config.windowMinutes * 60_000;

	async function run<T>(action: () => Promise<T>): Outcome<T> {
		try {
			return ok(await action());
		} catch (error) {
			return err(toAppError(error));
		}
	}

	function audit(
		paymentId: string,
		action: string,
		actorId: string | null,
		note: string | null = null
	): PaymentAuditEntry {
		return { id: newId(), paymentId, actorId, action, note, createdAt: clock.now() };
	}

	async function expireIfLapsed(payment: PaymentRecord): Promise<PaymentRecord> {
		if (!OPEN.includes(payment.status) || payment.expiresAt >= clock.now()) return payment;
		const expired = await repository.expire(
			payment.id,
			clock.now(),
			audit(payment.id, 'expired', null)
		);
		if (expired) await hooks.onExpired(payment.orderId);
		return (await repository.findPayment(payment.id)) ?? payment;
	}

	async function ownPayment(ref: string, actor: Actor | null): Promise<PaymentRecord> {
		const user = assertActor(actor);
		const found = (await repository.findPayment(ref)) ?? (await repository.findPaymentByOrder(ref));
		// Someone else's payment reads as missing so ids cannot be probed.
		if (!found || found.userId !== user.id) throw new NotFoundError('Payment not found');
		return expireIfLapsed(found);
	}

	async function customerView(payment: PaymentRecord): Promise<CustomerPayment> {
		const latest = await repository.latestProof(payment.id);
		return {
			id: payment.id,
			orderId: payment.orderId,
			baseAmount: payment.baseAmount,
			uniqueCode: payment.uniqueCode,
			totalAmount: payment.totalAmount,
			status: payment.status,
			expiresAt: payment.expiresAt,
			paidAt: payment.paidAt,
			qrisImageUrl: config.qrisImageUrl,
			rejectReason: payment.status === 'rejected' ? (latest?.rejectReason ?? null) : null,
			rejectNote: payment.status === 'rejected' ? (latest?.rejectNote ?? null) : null,
			hasProof: latest !== null
		};
	}

	async function requirePayment(id: string): Promise<PaymentRecord> {
		const found = await repository.findPayment(id);
		if (!found) throw new NotFoundError('Payment not found');
		return found;
	}

	const markPaid: PaymentsService['markPaid'] = (paymentId, actorId) =>
		run(async () => {
			const payment = await requirePayment(paymentId);

			if (payment.status !== 'paid') {
				if (payment.status !== 'awaiting_verification') {
					throw new UnprocessableError(`Cannot approve a payment that is ${payment.status}`);
				}
				const now = clock.now();
				const approved = await repository.approve(
					paymentId,
					actorId ?? 'system',
					now,
					audit(paymentId, 'approved', actorId)
				);
				// Lost a race with another approval/rejection: re-read and fall through to idempotency.
				if (!approved) {
					const current = await requirePayment(paymentId);
					if (current.status !== 'paid') {
						throw new ConflictError('Payment state changed, reload and try again');
					}
				}
			}

			// Always (re)assert the order is paid: if a previous attempt died after the payment
			// transaction, a retry completes fulfilment. orders.markPaid is idempotent.
			unwrap(await orders.orders.markPaid(payment.orderId, actorId, 'QRIS payment verified'));
			return requirePayment(paymentId);
		});

	return {
		createPayment: (orderId, actor) =>
			run(async () => {
				const user = assertActor(actor);
				const order = unwrap(await orders.orders.getMyOrder(orderId, actor));

				if (order.status !== 'pending') {
					throw new UnprocessableError(`Order is ${order.status} and cannot be paid`);
				}
				if (order.currency !== 'IDR') throw new UnprocessableError('QRIS only supports IDR orders');
				// The amount always comes from the stored order, never from the client.
				const baseAmount = order.grandTotal;
				if (!Number.isInteger(baseAmount) || baseAmount <= 0) {
					throw new UnprocessableError('Order has nothing to pay');
				}

				const existing = await repository.findPaymentByOrder(order.id);
				if (existing) {
					const current = await expireIfLapsed(existing);
					if (current.status !== 'expired') return customerView(current);
					throw new UnprocessableError('The payment window for this order has expired');
				}

				const now = clock.now();
				for (let attempt = 0; attempt < UNIQUE_CODE_ATTEMPTS; attempt++) {
					const uniqueCode = randomCode(UNIQUE_CODE_MIN, UNIQUE_CODE_MAX);
					const payment: PaymentRecord = {
						id: newId(),
						orderId: order.id,
						userId: user.id,
						baseAmount,
						uniqueCode,
						totalAmount: baseAmount + uniqueCode,
						status: 'pending_payment',
						expiresAt: new Date(now.getTime() + windowMs),
						paidAt: null,
						createdAt: now
					};
					try {
						await repository.insertPayment(payment, audit(payment.id, 'created', user.id));
						return customerView(payment);
					} catch (error) {
						// Another open payment already uses this total: pick a new code.
						if (!(error instanceof OpenAmountCollisionError)) throw error;
					}
				}
				throw new ConflictError('Could not allocate a unique payment amount, please retry');
			}),

		getMyPayment: (ref, actor) => run(async () => customerView(await ownPayment(ref, actor))),

		uploadProof: (paymentId, file, actor) =>
			run(async () => {
				const user = assertActor(actor);
				const payment = await ownPayment(paymentId, actor);

				if (payment.status === 'expired' || payment.expiresAt < clock.now()) {
					throw new UnprocessableError('The payment window has expired');
				}
				if (!OPEN.includes(payment.status)) {
					throw new UnprocessableError(
						`Proof cannot be uploaded while the payment is ${payment.status}`
					);
				}

				const recent = await repository.countProofsSince(
					payment.id,
					new Date(clock.now().getTime() - 3_600_000)
				);
				if (recent >= PROOF_UPLOADS_PER_HOUR) {
					throw new RateLimitedError('Too many uploads for this order, try again later');
				}

				if (file.size > PROOF_MAX_BYTES || file.bytes.length > PROOF_MAX_BYTES) {
					throw new ValidationError('Proof image must be 5 MB or smaller');
				}
				const mime = sniffMime(file.bytes);
				if (!mime) throw new ValidationError('Proof must be a JPG, PNG or WebP image');

				// Hash the cleaned bytes so re-saving the same screenshot with new metadata still matches.
				const clean = stripMetadata(file.bytes, mime);
				const hash = sha256(clean);
				if (await repository.hashExists(hash)) {
					throw new ConflictError('This proof image has already been submitted');
				}

				const path = await storage.save(`${newId()}.${EXTENSIONS[mime]}`, clean);
				try {
					await repository.attachProof(
						{
							id: newId(),
							paymentId: payment.id,
							filePath: path,
							fileHash: hash,
							uploadedAt: clock.now(),
							reviewStatus: 'pending',
							reviewedBy: null,
							reviewedAt: null,
							rejectReason: null,
							rejectNote: null
						},
						audit(payment.id, 'proof_uploaded', user.id),
						clock.now()
					);
				} catch (error) {
					if (error instanceof DuplicateProofError) {
						throw new ConflictError('This proof image has already been submitted');
					}
					throw error;
				}
				return customerView(await requirePayment(payment.id));
			}),

		readProof: (paymentId, proofId, actor) =>
			run(async () => {
				const user = assertActor(actor);
				const payment = await requirePayment(paymentId);
				const isAdmin = user.permissions.has('admin:access');
				if (!isAdmin && payment.userId !== user.id) throw new NotFoundError('Proof not found');

				const proof = proofId
					? await repository.findProof(proofId)
					: await repository.latestProof(paymentId);
				if (!proof || proof.paymentId !== paymentId) throw new NotFoundError('Proof not found');

				const extension = proof.filePath.split('.').pop() ?? '';
				return {
					bytes: await storage.read(proof.filePath),
					mime: IMAGE_MIME[extension] ?? 'application/octet-stream'
				};
			}),

		listQueue: (query, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const { data, total } = await repository.listQueue(query);
				const rows: AdminQueueItem[] = await Promise.all(
					data.map(async ({ payment, uploadedAt }) => {
						const order = unwrap(await orders.orders.getOrder(payment.orderId, actor));
						return {
							id: payment.id,
							orderId: payment.orderId,
							orderNumber: order.orderNumber,
							userId: payment.userId,
							customerName: order.customer?.name ?? order.customer?.email ?? null,
							totalAmount: payment.totalAmount,
							status: payment.status,
							uploadedAt,
							createdAt: payment.createdAt
						};
					})
				);
				return { data: rows, page: query.page, pageSize: query.pageSize, total };
			}),

		getAdminDetail: (paymentId, actor) =>
			run(async () => {
				assertPermission(actor, 'admin:access');
				const payment = await expireIfLapsed(await requirePayment(paymentId));
				const order = unwrap(await orders.orders.getOrder(payment.orderId, actor));
				const [proofs, trail] = await Promise.all([
					repository.listProofs(payment.id),
					repository.listAudit(payment.id)
				]);
				return {
					payment,
					customer: {
						id: payment.userId,
						name: order.customer?.name ?? null,
						email: order.customer?.email ?? null
					},
					order: { orderNumber: order.orderNumber, status: order.status, currency: order.currency },
					// File paths and hashes stay server side; the image is fetched through readProof.
					proofs: proofs.map(({ filePath: _path, fileHash: _hash, ...rest }) => rest),
					audit: trail
				};
			}),

		approve: (paymentId, actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				unwrap(await markPaid(paymentId, admin.id));
				return customerView(await requirePayment(paymentId));
			}),

		markPaid,

		reject: (paymentId, input, actor) =>
			run(async () => {
				const admin = assertPermission(actor, 'admin:access');
				if (!(REJECT_REASONS as readonly string[]).includes(input.reason)) {
					throw new ValidationError('Choose a valid rejection reason');
				}
				const reason = input.reason as RejectReason;
				const note = input.note?.trim() || null;
				const payment = await requirePayment(paymentId);
				if (payment.status !== 'awaiting_verification') {
					throw new UnprocessableError(`Cannot reject a payment that is ${payment.status}`);
				}

				const rejected = await repository.reject(
					paymentId,
					admin.id,
					reason,
					note,
					clock.now(),
					audit(paymentId, 'rejected', admin.id, note ? `${reason}: ${note}` : reason)
				);
				if (!rejected) throw new ConflictError('Payment state changed, reload and try again');

				// No mailer exists, so the customer is told through the order timeline.
				unwrap(
					await orders.orders.updateOrder(
						payment.orderId,
						{
							note: `Payment proof rejected (${reason.replaceAll('_', ' ')}). Please upload a new proof.`
						},
						actor
					)
				);
				return customerView(await requirePayment(paymentId));
			}),

		expireDue: (limit = 100) =>
			run(async () => {
				const due = await repository.listDueForExpiry(clock.now(), limit);
				let expired = 0;
				for (const payment of due) {
					const current = await expireIfLapsed(payment);
					if (current.status === 'expired') expired++;
				}
				return { expired };
			})
	};
}
