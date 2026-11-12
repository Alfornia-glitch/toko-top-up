# audit

The back-office audit trail: who did what to which record.

## Public API

- `index.ts`: `AuditEntry`, `AuditRecord`, `AuditListQuery`, `DEFAULT_RETENTION_DAYS`.
- `server.ts`: `createAuditServices()` returning `{ audit }`.

## Owned tables

- `audit_log` — `actor_user_id` is a plain user id, not a foreign key. Entries therefore survive the deletion of the user who made them.

## Service-to-service API

- `record(entry)` — appends an entry. Needs no actor, so request handlers and other modules can call it after a change. Use the request helper `auditRequest` in `src/lib/server/http/audit.ts` to fill in the actor, IP address and user agent from a request.

## Events

- Emits and consumes none.

## Permissions

- `list`, `count` and `purgeOld` require `super:access` (superadmin).
- `purgeOld` deletes entries older than `days` (90 by default) and returns the number removed.

## Allowed dependencies

- `shared` only.
