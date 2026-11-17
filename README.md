# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Developing

Requires Node >= 22.22.2 and pnpm. Install dependencies from this directory and start the dev server:

```sh
pnpm install
pnpm run dev

# or start the server and open the app in a new browser tab
pnpm run dev --open
```

## Building

The build uses `@sveltejs/adapter-netlify`, which writes the server function to `.netlify/v1/` and static assets to `build/`:

```sh
pnpm run build
pnpm run preview
```

## Deploying (Netlify)

The app deploys to Netlify from git (`netlify.toml`: `pnpm run build`, publish `build`, Node 22).

Use the Supabase profile (`env.supabase.example`) in the Netlify site settings. SQLite needs a persistent disk, and Netlify's function filesystem is ephemeral. Set `DB_PROVIDER=postgres`, `STORAGE_PROVIDER=supabase`, `DATABASE_URL`, the `SUPABASE_*` variables, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` (the public Netlify origin). Make sure the variables are available to Functions (runtime), not only to builds.

Run `pnpm run db:push` once against the Supabase database from a local machine. The build does not migrate.

The VPS profile (SQLite + RustFS) is not supported on Netlify, but runs on any Node host.

## Manual QRIS payments

Customers pay a static merchant QRIS in their banking/e-wallet app, upload a screenshot, and an admin
verifies it against the real bank mutation before the order becomes `paid`. No gateway is involved.

**Config** (`src/env.ts`, see `env.vps.example`): `QRIS_IMAGE_URL` (merchant QR image), `PAYMENT_PROOF_DIR`
(private proof directory, default `./data/payment-proofs`, needs a writable filesystem so it suits the VPS
deployment, not Netlify), `PAYMENT_WINDOW_MINUTES` (default 30), `PAYMENT_EXPIRE_SECRET` (cron secret).
Currency must be IDR; amounts are whole rupiah.

**Flow**: checkout with the QRIS tab creates a `pending` order and a `payments_orders` row
(`total = base + unique code 1-999`, unique among open payments via a partial unique index) ->
`/account/payments/:id` shows QR, exact total and countdown -> proof upload (JPG/PNG/WebP, 5 MB, type sniffed
from bytes, metadata stripped, SHA-256 de-duplicated, 5 per hour) -> `awaiting_verification` ->
admin at `/admin/payments` approves (atomic, idempotent; calls `orders.markPaid`) or rejects with a reason
(customer may re-upload while the window is open). Unpaid payments expire after the window: the order is
cancelled and stock released. Run `POST /api/internal/payments/expire` with header `x-cron-secret` every few
minutes; reads also expire lazily.

Proofs are never public: they are streamed only through `/api/payments/:id/proof` (owner or admin) and
`/api/admin/payments/:id/proof` (admin).

**Swapping in a gateway**: a webhook handler (after verifying signature and amount) calls
`payments.payments.markPaid(paymentId, null)`. That is the same function admin approval uses (see the
`GATEWAY WEBHOOK EXTENSION POINT` comment in `payments-service.ts`), so the order model is unchanged.
