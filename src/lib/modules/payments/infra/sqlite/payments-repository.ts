import { and, asc, count, desc, eq, gte, inArray, lt, max } from 'drizzle-orm';
import type { SqliteDb } from '#db/core.ts';
import {
	DuplicateProofError,
	OpenAmountCollisionError,
	type PaymentsRepository
} from '../../domain/payments.ts';
import { paymentAuditLog, paymentProofs, paymentRecords } from './schema.ts';

function isUnique(error: unknown, needle: string): boolean {
	const message = error instanceof Error ? error.message : '';
	return message.includes('UNIQUE constraint failed') && message.includes(needle);
}

export function createSqlitePaymentsRepository(db: SqliteDb): PaymentsRepository {
	return {
		async findPayment(id) {
			const [row] = await db
				.select()
				.from(paymentRecords)
				.where(eq(paymentRecords.id, id))
				.limit(1);
			return row ?? null;
		},

		async findPaymentByOrder(orderId) {
			const [row] = await db
				.select()
				.from(paymentRecords)
				.where(eq(paymentRecords.orderId, orderId))
				.orderBy(desc(paymentRecords.createdAt))
				.limit(1);
			return row ?? null;
		},

		async listQueue(query) {
			const where = query.status ? eq(paymentRecords.status, query.status) : undefined;
			const rows = await db
				.select({ payment: paymentRecords, uploadedAt: max(paymentProofs.uploadedAt) })
				.from(paymentRecords)
				.leftJoin(paymentProofs, eq(paymentProofs.paymentId, paymentRecords.id))
				.where(where)
				.groupBy(paymentRecords.id)
				.orderBy(asc(paymentRecords.createdAt))
				.limit(query.pageSize)
				.offset((query.page - 1) * query.pageSize);
			const [total] = await db.select({ value: count() }).from(paymentRecords).where(where);
			return {
				data: rows.map((row) => ({
					payment: row.payment,
					uploadedAt: row.uploadedAt ? new Date(row.uploadedAt) : null
				})),
				total: Number(total?.value ?? 0)
			};
		},

		listProofs(paymentId) {
			return db
				.select()
				.from(paymentProofs)
				.where(eq(paymentProofs.paymentId, paymentId))
				.orderBy(desc(paymentProofs.uploadedAt));
		},

		async latestProof(paymentId) {
			const [row] = await db
				.select()
				.from(paymentProofs)
				.where(eq(paymentProofs.paymentId, paymentId))
				.orderBy(desc(paymentProofs.uploadedAt))
				.limit(1);
			return row ?? null;
		},

		async findProof(id) {
			const [row] = await db.select().from(paymentProofs).where(eq(paymentProofs.id, id)).limit(1);
			return row ?? null;
		},

		async hashExists(hash) {
			const [row] = await db
				.select({ id: paymentProofs.id })
				.from(paymentProofs)
				.where(eq(paymentProofs.fileHash, hash))
				.limit(1);
			return Boolean(row);
		},

		async countProofsSince(paymentId, since) {
			const [row] = await db
				.select({ value: count() })
				.from(paymentProofs)
				.where(and(eq(paymentProofs.paymentId, paymentId), gte(paymentProofs.uploadedAt, since)));
			return Number(row?.value ?? 0);
		},

		listAudit(paymentId) {
			return db
				.select()
				.from(paymentAuditLog)
				.where(eq(paymentAuditLog.paymentId, paymentId))
				.orderBy(asc(paymentAuditLog.createdAt));
		},

		// better-sqlite3 transactions are synchronous: no async callback, no await.
		async insertPayment(payment, audit) {
			try {
				db.transaction((tx) => {
					tx.insert(paymentRecords).values(payment).run();
					tx.insert(paymentAuditLog).values(audit).run();
				});
			} catch (error) {
				if (isUnique(error, 'payments_orders.total_amount')) throw new OpenAmountCollisionError();
				throw error;
			}
		},

		async attachProof(proof, audit, now) {
			try {
				db.transaction((tx) => {
					tx.insert(paymentProofs).values(proof).run();
					const moved = tx
						.update(paymentRecords)
						.set({ status: 'awaiting_verification' })
						.where(
							and(
								eq(paymentRecords.id, proof.paymentId),
								inArray(paymentRecords.status, ['pending_payment', 'rejected']),
								gte(paymentRecords.expiresAt, now)
							)
						)
						.run();
					if (moved.changes === 0) throw new Error('Payment is not accepting proofs');
					tx.insert(paymentAuditLog).values(audit).run();
				});
			} catch (error) {
				if (isUnique(error, 'file_hash')) throw new DuplicateProofError();
				throw error;
			}
		},

		async approve(paymentId, reviewer, now, audit) {
			return db.transaction((tx) => {
				const updated = tx
					.update(paymentRecords)
					.set({ status: 'paid', paidAt: now })
					.where(
						and(
							eq(paymentRecords.id, paymentId),
							eq(paymentRecords.status, 'awaiting_verification')
						)
					)
					.run();
				if (updated.changes === 0) return false;
				tx.update(paymentProofs)
					.set({ reviewStatus: 'approved', reviewedBy: reviewer, reviewedAt: now })
					.where(
						and(eq(paymentProofs.paymentId, paymentId), eq(paymentProofs.reviewStatus, 'pending'))
					)
					.run();
				tx.insert(paymentAuditLog).values(audit).run();
				return true;
			});
		},

		async reject(paymentId, reviewer, reason, note, now, audit) {
			return db.transaction((tx) => {
				const updated = tx
					.update(paymentRecords)
					.set({ status: 'rejected' })
					.where(
						and(
							eq(paymentRecords.id, paymentId),
							eq(paymentRecords.status, 'awaiting_verification')
						)
					)
					.run();
				if (updated.changes === 0) return false;
				tx.update(paymentProofs)
					.set({
						reviewStatus: 'rejected',
						reviewedBy: reviewer,
						reviewedAt: now,
						rejectReason: reason,
						rejectNote: note
					})
					.where(
						and(eq(paymentProofs.paymentId, paymentId), eq(paymentProofs.reviewStatus, 'pending'))
					)
					.run();
				tx.insert(paymentAuditLog).values(audit).run();
				return true;
			});
		},

		async expire(paymentId, now, audit) {
			return db.transaction((tx) => {
				const updated = tx
					.update(paymentRecords)
					.set({ status: 'expired' })
					.where(
						and(
							eq(paymentRecords.id, paymentId),
							inArray(paymentRecords.status, ['pending_payment', 'rejected']),
							lt(paymentRecords.expiresAt, now)
						)
					)
					.run();
				if (updated.changes === 0) return false;
				tx.insert(paymentAuditLog).values(audit).run();
				return true;
			});
		},

		listDueForExpiry(now, limit) {
			return db
				.select()
				.from(paymentRecords)
				.where(
					and(
						inArray(paymentRecords.status, ['pending_payment', 'rejected']),
						lt(paymentRecords.expiresAt, now)
					)
				)
				.limit(limit);
		}
	};
}
