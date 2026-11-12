# ImplementPrototypeUI-svelte

SvelteKit 3 + Svelte 5 (runes) + Tailwind CSS v4 + TypeScript 6 strict reimplementation of the React/Vite prototype in `../ImplementPrototypeUI` (same folder name, sibling). Bun server with CSR/SPA shell: `@sveltejs/adapter-bun`, `ssr = false`, `prerender = false` (see `src/routes/+layout.ts`). The server runtime serves the SPA shell and `/api/auth/*`.

This app is self-contained: it has its own `package.json` and `bun.lock` in `web/` (the repo's root workspace entries for `backend`/`frontend` no longer exist).

## Commands

Bun-only repo (no pnpm/npm). Run `bun install` from `web/`. Requires **Bun >= 1.4.2** — adapter-bun needs Bun >= 1.4, and Bun 1.3.9 has a `worker_threads` race (postMessage followed by `process.exit` in a worker drops the parent's exit event; [oven-sh/bun#14144](https://github.com/oven-sh/bun/issues/14144)) that makes `vite build` exit 0 silently in the middle of the pipeline (no `manifest.js`, stale `build/`).

- `bun run dev` — dev server (default port 5173)
- `bun run --bun build` — production build to `build/` (must run under Bun because adapter-bun calls `Bun.build`; `bunfig.toml` also forces Bun for `bun run build`)
- `bun run start` / `bun run preview` — serve the built app with `bun ./build` (default port 3000)
- `bun run check` — `svelte-kit sync` + `svelte-check` (must stay 0 errors / 0 warnings)
- `bun run db:push` — `bun scripts/setup-db.ts` (creates the `auth_app` schema for Postgres, the data directory for SQLite) then `bun scripts/db-tool.ts push` (a wrapper over drizzle-kit; reads `DB_PROVIDER` and picks `drizzle.pg.config.ts` or `drizzle.sqlite.config.ts`). Also `bun run db:generate` / `db:migrate`
- `bun run storage:setup` — `bun scripts/setup-storage.ts` (creates or updates the public Supabase Storage bucket from `SUPABASE_STORAGE_BUCKET` with the 5 MiB/MIME limits; no-op when `STORAGE_PROVIDER=rustfs`)
- `bun run lint` / `bun run format` — Prettier check / write (required before finishing)

`bunfig.toml` sets `[run] bun = true`, so scripts and CLIs run under the Bun runtime instead of Node shebangs.

## Configuration (SvelteKit 3)

- **No `svelte.config.ts`** — kit 3 rejects it (`kit/config_file_unsupported`). Config is inline in `vite.config.ts` via `sveltekit({ compilerOptions, adapter, paths })`. `paths.origin` is taken from the optional `ORIGIN` env var at build time; leave it empty behind TLS so adapter-bun can derive the host.
- **`tsconfig.json` extends `"$app/tsconfig"`** (kit 3's preset: `paths: {}`, `types`, `noEmit`, `allowImportingTsExtensions`). Do not set `paths` for aliases. `compilerOptions.types` **replaces** the inherited array, so it must list both: `["$app/types", "bun"]` (the `bun` entry gives `bun:sqlite` / `Bun` global types to `src/lib/server`).
- **Env vars live in `src/env.ts`** (`defineEnvVars` from `@sveltejs/kit/env`) and are read as `$app/env/private` — kit 3 removed `$env/dynamic/private`, and `$env/static/private` is deprecated. `DB_PROVIDER` (`sqlite` | `postgres`), `STORAGE_PROVIDER` (`supabase` | `rustfs`), `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are required; the provider values are validated by schema functions. Provider-specific vars (`SQLITE_PATH`, `DATABASE_URL`, `SUPABASE_*`, `RUSTFS_*`) are optional in `src/env.ts` and validated lazily by `createDb()` / `getStorageBackend()`, which throw a clear error when a var needed by the selected provider is missing. `GOOGLE_*` are optional. Bun auto-loads `.env` for both `vite dev` and `bun --bun vite build`; the drizzle config files (`drizzle.pg.config.ts`, `drizzle.sqlite.config.ts`) are the exception (drizzle-kit loads `.env` itself). `ORIGIN` is read from `process.env` in `vite.config.ts` at build time.
- **Two deployment profiles** (copy one to `.env`): `env.vps.example` = `DB_PROVIDER=sqlite` + `STORAGE_PROVIDER=rustfs`; `env.supabase.example` = `DB_PROVIDER=postgres` + `STORAGE_PROVIDER=supabase`. The two switches are independent, so mixed combinations work.
- **Path aliases live in `package.json` `imports`** (Node subpath imports, no `kit.alias`):
  - `#lib` → `./src/lib/index.ts`; `#lib/*` → `./src/lib/*`
  - `#db` → `./src/lib/server/db/index.ts`; `#db/*` → `./src/lib/server/db/*` (Drizzle; better-auth reads it)
- Import specifiers **must include the file extension** (`.ts`, `.svelte`) — TS 6 resolves subpath imports only with an explicit extension; directory imports need `/index.ts`. `rewriteRelativeImportExtensions` must stay off (it makes TS2877 an error on non-relative `.ts` imports).

## Project structure

- `src/routes/+layout.svelte` — wraps the app in `.commerce-app`
- `src/routes/layout.css` — Tailwind import, Geist/Inter/Roboto `@font-face`, responsive overrides keyed on `data-name` (35 rules) and two `data-node-id`s. Do not delete `data-name` attributes from markup while these rules exist.
- `src/routes/<path>/+page.svelte` — one route per prototype screen (24 files; `/products` switches 4 catalog variants on `?view` / `?sidebar` / `?banner` query params, mirroring `getRoute` in the React `App.tsx`)
- `src/lib/frontend/pages/` — `ProductGridBanner|ProductGridSidebar|ProductListBanner|ProductListSidebar.svelte` used by `/products`
- `src/lib/frontend/components/` — `SiteHeader.svelte` (home header variant, used on every page; props: `announcementCount`), `SiteFooter.svelte` (prop `features` — true only on home, `/products/phone`, `/products/shirt`), `MegaMenu.svelte`, `AccountSidebar.svelte` (only `/components` showcase)
- `src/lib/frontend/components/ui/` — `Plus`, `Minus`, `Radio`, `Rating`, `Avatar`, `InputNumber`, `Pagination`
- `src/lib/frontend/shellAssets.ts` — header/footer asset paths
- `src/lib/frontend/modules/landing/` — landing-page sections (`HeroSection`, `BrandsSection`, …)
- `src/lib/server/modules/auth/` — better-auth server config (`index.ts`: `betterAuth` + `drizzleAdapter` + `sveltekitCookies`; lazy-imported by `src/hooks.server.ts`, typed in `src/app.d.ts`)
- `src/lib/server/db/` — Drizzle client and schema for both providers (`drizzle-orm/bun-sqlite` + `schema/sqlite`, `drizzle-orm/bun-sql` + `schema/postgres`; `schema.pg.ts` / `schema.sqlite.ts` aggregate the module-owned schemas plus legacy tables; env comes from `src/env.ts` via `$app/env/private`); `scripts/setup-db.ts` creates the `auth_app` schema for Postgres, then `bun run db:push` syncs the tables. Postgres tables are declared with `pgSchema('auth_app').table(…)` (drizzle 0.45 `pgTable` has no `schema` option), so queries are schema-qualified and need no `search_path`. The schema is deliberately not in Supabase's Exposed schemas.
- `src/lib/server/modules/storage/` — pluggable media backends selected by `STORAGE_PROVIDER`: `supabase.ts` (`@supabase/storage-js` public bucket) and `rustfs.ts` (`Bun.S3Client` against a RustFS/S3-compatible endpoint, `public-read` ACL, permanent URLs from `RUSTFS_PUBLIC_URL`); `backend.ts` validates env lazily, `index.ts` keeps the shared validation and `uploadMedia()` API. Server-only (under `src/lib/server/`, and `$app/env/private` is guarded anyway) because `SUPABASE_SECRET_KEY` (the `sb_secret_…` key from the dashboard's Publishable and secret API keys tab) bypasses Storage RLS. Uploads are limited to `image/jpeg|png|webp|avif|gif` and 5 MiB; the extension comes from the MIME map, never from the client filename.
- `src/routes/api/upload/+server.ts` — the only custom endpoint besides `/api/auth/*`. `POST` (multipart `file`, optional single-segment `folder`) returns `201 { path, url, contentType, size }`; `401` without a session, `400`/`413`/`415` on bad input, `502` when Storage rejects the write. Use `Response.json`, not kit 3's deprecated `json()`/`error()`.
- `tools/convert.mjs` — JSX → Svelte converter (full-page and `--snippet` modes); strips `data-node-id`, keeps `data-name`, strips embedded `Header`/`Footer` sections
- `tools/rewire.mjs` — CLI to wire real handlers: `button` / `buttonall` (div → `<button onclick={() => goto(path)}>`), `span`, `p`, `row` (nav rows → `<a>`), `tab` (`data-name="Tab item|0N"` → `<a>`)
- `static/assets/` — 406 SVGs (+ PNG paths referenced as in the original, some intentionally missing/broken like the React app)

## Conventions

- **Imports**: use `#lib/...` for app code (e.g. `#lib/frontend/components/SiteHeader.svelte`, `#lib/server/modules/auth/index.ts`) and `#db` for the Drizzle instance. `src/lib/server/**` is SvelteKit's server-only guard. No `#backend`, `@backend`, or `@database` specifiers remain.
- UI Style: use svelte-shadcn library https://www.shadcn-svelte.com/ & avoid to manually
  write components from scratch
- Idiomatic interactivity: real `<a href>` / `<button onclick>` (+ `goto` from `$app/navigation` for JS navigation). No global click delegation (the React app's `handlePageClick` label table in `App.tsx:1881-1942` is the acceptance checklist for what is wired, and which accidental skips are intentional: headings, radio option labels, stepper step labels in ReturnsRefunds, "Save changes" on checkout).
- Every page renders `<SiteHeader />` right after its root div and `<SiteFooter />` (possibly `features`) right before the root close.
- `data-node-id` is stripped everywhere except two elements on `/products/phone` (`I1:21686;31919:11168/11169`) which `layout.css` still needs for the mobile PDP layout.
- Prettier formats everything; keep double quotes where the source has apostrophes.
- Make each module both in server & client have the structure of `index.ts` (exports) + `<name>.ts` (implementation).
  models(types or interfaces), middleware, and services.

## Modular monolith (in progress)

- Modules live in `src/lib/modules/<module>/`. Public entries are `index.ts` (client-safe) and `server.ts` (server-only); everything else is private.
- Nested modules live under `modules/<child>/` and may only be imported by their direct parent.
- `shared/` never imports modules. Routes import only top-level module entries and `shared`.
- Architecture is enforced by `bun run arch` (`dependency-cruiser` + `local/module-boundaries`), `bun run check:data` (table prefixes and foreign-table imports), and `bun run check:schema` (Postgres/SQLite parity).
- New migration workflow: `bun run db:generate` writes to `migrations/pg` or `migrations/sqlite` based on `DB_PROVIDER`; `bun run db:migrate` applies it; `bun run db:push` remains the dev shortcut.
- Admin UI routes are grouped as `src/routes/(admin)/admin/**` and `src/routes/(admin)/(super)/admin/super/**`; URLs are unchanged and super pages still render inside `AdminShell`.

### Migration debt (tracked)

- `src/lib/frontend/**`, most of `src/lib/server/modules/**`, and legacy routes are still excluded from ESLint/dependency-cruiser until the Phase 7 one-module-at-a-time migration deletes them.
- Only `catalog`, `reporting`, `content`, `customers`, `support` and `marketing` own module schemas today (`marketing_*`: coupons, coupon redemptions, gift cards, gift card transactions, newsletter subscriptions; `support_*`: tickets, ticket messages; `content_*`: banners, announcements, testimonials, media assets, site settings; `customers_*`: addresses, wishlists). Reviews still live in the legacy schema and the legacy `content/reviews.ts`. Legacy modules still query through `#db/query.ts` and the shared legacy schema tree.
- `reviews`, `review_images`, and `commerce.ts` temporarily import the catalog module schema for foreign keys; remove those imports when reviews and the commerce modules migrate. Legacy `commerce.ts` also imports the marketing `coupons` table for the `carts` and `orders` foreign keys. Coupon redemption now goes through the marketing module, but legacy checkout calls it after the order commits (non-atomic) until the checkout module's saga replaces it.
- Catalog submodules (`brands`, `categories`, `products`, `inventory`) keep domain/application code but no own `infra/` folder. Catalog intentionally owns the aggregate schema and the repository adapters (`catalog/infra/{pg,sqlite}/repositories/`) so no submodule joins a sibling's tables.
- Legacy modules still read `catalog_*` tables directly through `#db/query.ts` (`storefront`, `cart`, `checkout`, `account/wishlist`, `content/reviews`, `reports`, `super`); `check:data` does not scan `src/lib/server/modules`.
- Tests need the Bun runtime (`bun --bun run test:sqlite`); plain `vitest` under Node fails with `Cannot find package 'bun'`.
- `drizzle-kit push` baselines now live in `migrations/pg` and `migrations/sqlite`. Existing local databases must run `bun scripts/rename-catalog-tables.ts` once (it also renames the `content_*`, `customers_*` and `marketing_*` tables) before using the new schema; the app has not been deployed, so production migration is not required yet.
- **SQLite transactions must be synchronous.** Drizzle's bun-sqlite `db.transaction` runs its callback synchronously and commits when it returns, so an `async` callback with `await` is not atomic (a throw does not roll back). In `infra/sqlite/` use `db.transaction((tx) => { … tx.insert(…).values(…).run(); const [row] = tx.select(…).all(); })` with no `await`; Postgres adapters use `async`/`await`. Legacy `queryDb.transaction(async …)` calls (`checkout`, `orders`, `super/users`) are not atomic on SQLite until those modules migrate.
- Playwright smoke is configured but still not part of `verify`.
- `eslint-plugin-boundaries` cannot resolve Node subpath imports (`#modules`, `#shared`, `#db`), so the local `local/module-boundaries` rule stays authoritative until that resolver gap is closed.

## Verification

`bun run check` (0/0), `bun run lint`, `bun run --bun build` (log must end with `✔ done` — a silent mid-pipeline exit means Bun is < 1.4.2), then `bun run preview` and smoke-test all routes (known routes return 200 with the SPA shell; unknown paths such as `/account` and `/checkout` return 404 because they have no `+page.svelte`, only subroutes). Compare interaction wiring against the React app on port 8443 (`../ImplementPrototypeUI`).

Auth endpoints (`/api/auth/*`, served by better-auth through `src/hooks.server.ts`) exist under `bun run dev` and the built Bun server. Verify with `GET /api/auth/ok` and `GET /api/auth/get-session`. Production needs the `DB_PROVIDER`, `BETTER_AUTH_*` vars (see `env.vps.example` / `env.supabase.example`) and the auth tables (`bun run db:push`).

Storage: `POST /api/upload` without a session returns `401`; `GET` returns `405`; a cross-origin POST returns `403` (SvelteKit CSRF). `STORAGE_PROVIDER` selects the backend: `supabase` needs `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` (declared optional in `src/env.ts`, required by `getStorageBackend()`); `rustfs` needs `RUSTFS_ENDPOINT`, `RUSTFS_BUCKET`, `RUSTFS_ACCESS_KEY`, `RUSTFS_SECRET_KEY`, and `RUSTFS_PUBLIC_URL` (`RUSTFS_REGION` defaults to `us-east-1`). Create the Supabase bucket with `bun run storage:setup` (public access, 5 MiB and the MIME types in `src/lib/server/modules/storage/rules.ts`); the RustFS/S3 bucket must allow anonymous reads (public policy) because uploads set `acl: public-read`. Local HTTP testing needs `ORIGIN=http://localhost:<port>` at build time _and_ `BETTER_AUTH_URL` at runtime with the same origin, otherwise `/api/auth/*` 404s and same-origin form POSTs get 403 CSRF.

## Deployment

Ship `build/`, `package.json`, and `bun.lock`; runtime dependencies (`better-auth`, `drizzle-orm`, `@supabase/storage-js`) are externalised, so run `bun install --production --frozen-lockfile` on the server. Start with `bun ./build` (default `PORT=3000`; see `env.vps.example` / `env.supabase.example` for `HOST`, `PORT`, proxy headers, and limits). SQLite writes to `SQLITE_PATH`, so the VPS profile needs that directory to be persistent (and single-instance); run `bun run db:push` once before starting.

`BODY_SIZE_LIMIT` defaults to `512K` in the built Bun server, which is below the upload endpoint's 5 MiB limit, so set `BODY_SIZE_LIMIT=10M` (or `Infinity`) or large uploads die at the server before the endpoint can return its own `413` JSON. `vite dev` has no body limit.

`BETTER_AUTH_URL` must match the public origin. Behind TLS the adapter's default `https` assumption is correct; when serving plain HTTP directly, build with `ORIGIN=http://localhost:3000 bun run --bun build` (or configure the proxy headers at runtime). `ORIGIN` is intentionally ignored during `vite dev` so it cannot break the 5173 dev server.
