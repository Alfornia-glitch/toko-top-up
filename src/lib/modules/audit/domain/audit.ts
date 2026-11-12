export interface AuditRecord {
	id: string;
	actorUserId: string | null;
	action: string;
	entityType: string;
	entityId: string | null;
	beforeJson: unknown;
	afterJson: unknown;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
}

/** What a caller supplies; the module assigns the id and timestamp. */
export interface AuditEntry {
	actorUserId?: string | null | undefined;
	action: string;
	entityType: string;
	entityId?: string | null | undefined;
	before?: unknown;
	after?: unknown;
	ipAddress?: string | null | undefined;
	userAgent?: string | null | undefined;
}

export interface AuditListQuery {
	/** Matches the action text. */
	q?: string | undefined;
	/** Filters by entity type (the admin UI calls it "status"). */
	status?: string | undefined;
	page: number;
	pageSize: number;
}

export const DEFAULT_RETENTION_DAYS = 90;

export interface AuditRepository {
	insert(record: AuditRecord): Promise<void>;
	list(query: AuditListQuery): Promise<{ data: AuditRecord[]; total: number }>;
	count(): Promise<number>;
	/** Deletes entries older than the cutoff and returns how many were removed. */
	deleteOlderThan(cutoff: Date): Promise<number>;
}
