# support

Customer support tickets and the admin help desk.

## Public API

- `index.ts`: DTOs (`Ticket`, `AdminTicketDetail`, `CustomerTicketDetail`, `MessageView`, …).
- `server.ts`: `createSupportServices({ ..., users })` returning `{ support }`.

## Owned tables

- `support_tickets` — `user_id`, `order_id` and `assigned_admin_id` are plain ids, not foreign keys.
- `support_ticket_messages` — `sender_user_id` is a plain id; messages cascade with their ticket.

## Ports

- `SupportUserDirectory` — read-only lookup of user names and emails (including searching by email). The module does not own user accounts, so the runtime supplies the adapter (`src/lib/server/adapters/support-users.ts`).

## Events

- Emits and consumes none.

## Permissions

- Customer operations (`listMyTickets`, `getMyTicket`, `createTicket`, `addMyMessage`) act on the calling actor's own tickets; another user's ticket reads as not found.
- Admin operations (`listTickets`, `getTicket`, `updateTicket`, `addAdminMessage`) require `admin:access`.
- Customer views never expose `assignedAdminId`.
- `createTicket` does not check that `orderId` belongs to the caller; that stays the caller's concern until `orders` migrates.

## Allowed dependencies

- `shared` only.
