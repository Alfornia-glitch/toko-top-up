# ImplementPrototypeUI-svelte

SvelteKit 3 + Svelte 5 (runes) + Tailwind CSS v4 + TypeScript 6 strict reimplementation of the React/Vite prototype in `../ImplementPrototypeUI` (same folder name, sibling). Netlify deployment: `@sveltejs/adapter-netlify` (Node runtime, SSR functions); this branch is Node-only (no Bun). See `src/routes/+layout.ts` for the `ssr`/`prerender` flags.

This app is self-contained: it has its own `package.json` and `pnpm-lock.yaml` in `web/` (the repo's root workspace entries for `backend`/`frontend` no longer exist).

## Commands

pnpm + Node repo (no Bun). Run `pnpm install` from `web/`. Requires **Node >= 22.22.2** (see `engines`/`.nvmrc`; jsdom 31 needs it). Scripts under `scripts/` run through `tsx --env-file-if-exists=.env`, so a local `.env` is loaded for them.

- `pnpm run dev` — dev server (default port 5173)
- `pnpm run build` — production build via adapter-netlify (writes `.netlify/v1/` and static assets to `build/`)
- `pnpm run preview` — `vite preview` of the production build
- `pnpm run check` — `svelte-kit sync` + `svelte-check` (must stay 0 errors / 0 warnings)
- `pnpm run db:push` — `tsx scripts/setup-db.ts` (creates the `auth_app` schema for Postgres, the data directory for SQLite) then `tsx scripts/db-tool.ts push` (a wrapper over drizzle-kit; reads `DB_PROVIDER` and picks `drizzle.pg.config.ts` or `drizzle.sqlite.config.ts`). Also `pnpm run db:generate` / `db:migrate`
- `pnpm run storage:setup` — `tsx scripts/setup-storage.ts` (creates or updates the public Supabase Storage bucket from `SUPABASE_STORAGE_BUCKET` with the 5 MiB/MIME limits; no-op when `STORAGE_PROVIDER=rustfs`)
- `pnpm run lint` / `pnpm run format` — ESLint / Prettier write (required before finishing)

Running the built server directly on Node needs the env vars in the process: `node --env-file=.env …`. Netlify injects them from the site settings.

## Configuration (SvelteKit 3)

- **No `svelte.config.ts`** — kit 3 rejects it (`kit/config_file_unsupported`). Config is inline in `vite.config.ts` via `sveltekit({ compilerOptions, adapter, inspector })`. The adapter is `@sveltejs/adapter-netlify`.
- **`tsconfig.json` extends `"$app/tsconfig"`** (kit 3's preset: `paths: {}`, `types`, `noEmit`, `allowImportingTsExtensions`). Do not set `paths` for aliases. `compilerOptions.types` **replaces** the inherited array, so it must list both: `["$app/types", "node"]` (the `node` entry gives Node globals to `src/lib/server` and `scripts/`).
- **Env vars live in `src/env.ts`** (`defineEnvVars` from `@sveltejs/kit/env`) and are read as `$app/env/private` — kit 3 removed `$env/dynamic/private`, and `$env/static/private` is deprecated. `DB_PROVIDER` (`sqlite` | `postgres`), `STORAGE_PROVIDER` (`supabase` | `rustfs`), `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are required; the provider values are validated by schema functions. Provider-specific vars (`SQLITE_PATH`, `DATABASE_URL`, `SUPABASE_*`, `RUSTFS_*`) are optional in `src/env.ts` and validated lazily by `createDb()` / `getStorageBackend()`, which throw a clear error when a var needed by the selected provider is missing. `GOOGLE_*` are optional. Vite loads `.env` for `vite dev` and `vite build`; `tsx` scripts get it through `--env-file-if-exists=.env`, and drizzle-kit loads `.env` itself.- **Two deployment profiles** (copy one to `.env`): `env.vps.example` = `DB_PROVIDER=sqlite` + `STORAGE_PROVIDER=rustfs`; `env.supabase.example` = `DB_PROVIDER=postgres` + `STORAGE_PROVIDER=supabase`. The two switches are independent, so mixed combinations work.
- **Path aliases live in `package.json` `imports`** (Node subpath imports, no `kit.alias`):
  - `#lib` → `./src/lib/index.ts`; `#lib/*` → `./src/lib/*`
  - `#db` → `./src/lib/server/db/index.ts`; `#db/*` → `./src/lib/server/db/*` (Drizzle; better-auth reads it)
- Import specifiers **must include the file extension** (`.ts`, `.svelte`) — TS 6 resolves subpath imports only with an explicit extension; directory imports need `/index.ts`. `rewriteRelativeImportExtensions` must stay off (it makes TS2877 an error on non-relative `.ts` imports).

## Project structure

- `src/routes/+layout.svelte` — wraps the app in `.commerce-app`
- `src/routes/layout.css` — Tailwind import, Geist/Inter/Roboto `@font-face`, responsive overrides keyed on `data-name` (35 rules) and two `data-node-id`s. Do not delete `data-name` attributes from markup while these rules exist.
- `src/routes/<path>/+page.svelte` — one route per prototype screen (24 files; `/products` switches 4 catalog variants on `?view` / `?sidebar` / `?banner` query params, mirroring `getRoute` in the React `App.tsx`)
- `src/lib/frontend/pages/` — `ProductGridBanner|ProductGridSidebar|ProductListBanner|ProductListSidebar.svelte` used by `/products`
- `src/lib/frontend/components/` — `SiteHeader.svelte` (home header variant, used on every page; props: `announcementCount`), `SiteFooter.svelte` (prop `features` — true only on home), `MegaMenu.svelte`, `AccountSidebar.svelte`
- `src/lib/frontend/components/ui/` — `Plus`, `Minus`, `Radio`, `Rating`, `Avatar`, `InputNumber`, `Pagination`
- `src/lib/frontend/shellAssets.ts` — header/footer asset paths
- `src/lib/frontend/modules/landing/` — landing-page sections (`HeroSection`, `BrandsSection`, …)
- `src/lib/server/platform/auth/` — better-auth server config (`index.ts`: `betterAuth` + `drizzleAdapter` + `sveltekitCookies`; lazy-imported by `src/hooks.server.ts`, typed in `src/app.d.ts`)
- `src/lib/server/db/` — Drizzle client and schema for both providers (`drizzle-orm/better-sqlite3` + `schema/sqlite`, `drizzle-orm/postgres-js` + `schema/postgres`; `schema.pg.ts` / `schema.sqlite.ts` aggregate the module-owned schemas plus legacy tables; env comes from `src/env.ts` via `$app/env/private`); `scripts/setup-db.ts` creates the `auth_app` schema for Postgres, then `pnpm run db:push` syncs the tables. Postgres tables are declared with `pgSchema('auth_app').table(…)` (drizzle 0.45 `pgTable` has no `schema` option), so queries are schema-qualified and need no `search_path`. The schema is deliberately not in Supabase's Exposed schemas.
- `src/lib/server/platform/storage/` — pluggable media backends selected by `STORAGE_PROVIDER`: `supabase.ts` (`@supabase/storage-js` public bucket) and `rustfs.ts` (`@aws-sdk/client-s3` against a RustFS/S3-compatible endpoint, `public-read` ACL, permanent URLs from `RUSTFS_PUBLIC_URL`); `backend.ts` validates env lazily, `index.ts` keeps the shared validation and `uploadMedia()` API. Server-only (under `src/lib/server/`, and `$app/env/private` is guarded anyway) because `SUPABASE_SECRET_KEY` (the `sb_secret_…` key from the dashboard's Publishable and secret API keys tab) bypasses Storage RLS. Uploads are limited to `image/jpeg|png|webp|avif|gif` and 5 MiB; the extension comes from the MIME map, never from the client filename.
- `src/routes/api/upload/+server.ts` — the only custom endpoint besides `/api/auth/*`. `POST` (multipart `file`, optional single-segment `folder`) returns `201 { path, url, contentType, size }`; `401` without a session, `400`/`413`/`415` on bad input, `502` when Storage rejects the write. Use `Response.json`, not kit 3's deprecated `json()`/`error()`.
- `tools/convert.mjs` — JSX → Svelte converter (full-page and `--snippet` modes); strips `data-node-id`, keeps `data-name`, strips embedded `Header`/`Footer` sections
- `tools/rewire.mjs` — CLI to wire real handlers: `button` / `buttonall` (div → `<button onclick={() => goto(path)}>`), `span`, `p`, `row` (nav rows → `<a>`), `tab` (`data-name="Tab item|0N"` → `<a>`)
- `static/assets/` — 406 SVGs (+ PNG paths referenced as in the original, some intentionally missing/broken like the React app)

## Conventions

- **Imports**: use `#lib/...` for app code (e.g. `#lib/frontend/components/SiteHeader.svelte`, `#lib/server/platform/auth/index.ts`) and `#db` for the Drizzle instance. `src/lib/server/**` is SvelteKit's server-only guard. No `#backend`, `@backend`, or `@database` specifiers remain.
- UI Style: use svelte-shadcn library https://www.shadcn-svelte.com/ & avoid to manually
  write components from scratch
- Idiomatic interactivity: real `<a href>` / `<button onclick>` (+ `goto` from `$app/navigation` for JS navigation). No global click delegation (the React app's `handlePageClick` label table in `App.tsx:1881-1942` is the acceptance checklist for what is wired, and which accidental skips are intentional: headings, radio option labels, stepper step labels in ReturnsRefunds, "Save changes" on checkout).
- Every page renders `<SiteHeader />` right after its root div and `<SiteFooter />` (possibly `features`) right before the root close.
- `data-node-id` is stripped everywhere.
- Prettier formats everything; keep double quotes where the source has apostrophes.
- Make each module both in server & client have the structure of `index.ts` (exports) + `<name>.ts` (implementation).
  models(types or interfaces), middleware, and services.

## Internationalisation

Paraglide JS, Indonesian (`id`) is the base locale and English (`en`) is selected with the language toggle (cookie, no URL prefixes). UI strings must not be hard-coded: use `m.<area>_<key>()` from `#lib/paraglide/messages.js`, with messages in `messages/<area>/{id,en}.json` (one file pair per area; edit only your own). Use the locale-aware formatters in `src/lib/frontend/modules/commerce/format.ts`, the enum label helpers in `src/lib/frontend/i18n/labels.ts`, and `errorMessage()` for API errors. The generated `src/lib/paraglide/` is git-ignored (`pnpm run i18n:compile`). Full guide: [docs/i18n.md](./docs/i18n.md).

## Modular monolith (in progress)

- Modules live in `src/lib/modules/<module>/`. Public entries are `index.ts` (client-safe) and `server.ts` (server-only); everything else is private.
- Nested modules live under `modules/<child>/` and may only be imported by their direct parent.
- `shared/` never imports modules. Routes import only top-level module entries and `shared`.
- Architecture is enforced by `pnpm run arch` (`dependency-cruiser` + `local/module-boundaries`), `pnpm run check:data` (table prefixes and foreign-table imports), and `pnpm run check:schema` (Postgres/SQLite parity).
- New migration workflow: `pnpm run db:generate` writes to `migrations/pg` or `migrations/sqlite` based on `DB_PROVIDER`; `pnpm run db:migrate` applies it; `pnpm run db:push` remains the dev shortcut.
- Admin UI routes are grouped as `src/routes/(admin)/admin/**` and `src/routes/(admin)/(super)/admin/super/**`; URLs are unchanged and super pages still render inside `AdminShell`.

### Migration debt (tracked)

- ESLint and dependency-cruiser cover all of `src` (`tools/`, `scripts/` and `e2e/` are excluded). `src/lib/server/modules` no longer exists: business code lives in `src/lib/modules/*`, and the remaining server code is `src/lib/server/platform` (better-auth, storage, user administration, system information and danger actions, which compose module services), `src/lib/server/adapters` (ports that read data a module does not own) and `src/lib/server/http` (request helpers and zod validation).
- Composition modules without tables: `storefront` (public shop pages, site settings, wishlist) and `checkout` (order placement saga).
- Only `catalog`, `reporting`, `content`, `customers`, `support`, `marketing`, `cart`, `orders` and `audit` own module schemas today (`audit_log` is owned by `audit`; `orders_*`: orders, items, events, shipments, payments, returns, return images; `cart_*`: carts, cart items; `marketing_*`: coupons, coupon redemptions, gift cards, gift card transactions, newsletter subscriptions; `support_*`: tickets, ticket messages; `content_*`: banners, announcements, testimonials, media assets, site settings, reviews, review images; `customers_*`: addresses, wishlists). Legacy modules still query through `#db/query.ts` and the shared legacy schema tree.
- Catalog submodules (`brands`, `categories`, `products`, `inventory`) keep domain/application code but no own `infra/` folder. Catalog intentionally owns the aggregate schema and the repository adapters (`catalog/infra/{pg,sqlite}/repositories/`) so no submodule joins a sibling's tables.
- Tests run on Node: `pnpm run test:sqlite` (and `pnpm run test:pg` with `TEST_DATABASE_URL`).
- `drizzle-kit push` baselines now live in `migrations/pg` and `migrations/sqlite`. Existing local databases must run `tsx scripts/rename-catalog-tables.ts` once (it also renames the `content_*`, `customers_*`, `marketing_*` and `cart_*`, `orders_*` tables) before using the new schema; the app has not been deployed, so production migration is not required yet.
- **SQLite transactions must be synchronous.** Drizzle's better-sqlite3 `db.transaction` runs its callback synchronously and commits when it returns, so an `async` callback with `await` is not atomic (a throw does not roll back). In `infra/sqlite/` use `db.transaction((tx) => { … tx.insert(…).values(…).run(); const [row] = tx.select(…).all(); })` with no `await`; Postgres adapters use `async`/`await`.
- Playwright smoke is configured but still not part of `verify`.
- `eslint-plugin-boundaries` resolves the `#modules`, `#shared`, `#db` and `#lib` subpath imports through `eslint-import-resolver-typescript` (configured in `eslint.config.js`), so `boundaries/no-unknown-dependencies` is on for `src/lib/modules` and `src/lib/shared`; `module.server.ts`, `server.ts` and `infra/**` are the only module files allowed to import `#db`.

## Verification

`pnpm run check` (0/0), `pnpm run lint`, `pnpm run build` (log must end with `✔ done`), then `pnpm run preview` and smoke-test all routes (known routes return 200 with the SPA shell; unknown paths such as `/account` and `/checkout` return 404 because they have no `+page.svelte`, only subroutes). Compare interaction wiring against the React app on port 8443 (`../ImplementPrototypeUI`).

Auth endpoints (`/api/auth/*`, served by better-auth through `src/hooks.server.ts`) exist under `pnpm run dev` and the built Node server. Verify with `GET /api/auth/ok` and `GET /api/auth/get-session`. Production needs the `DB_PROVIDER`, `BETTER_AUTH_*` vars (see `env.vps.example` / `env.supabase.example`) and the auth tables (`pnpm run db:push`).

Storage: `POST /api/upload` without a session returns `401`; `GET` returns `405`; a cross-origin POST returns `403` (SvelteKit CSRF). `STORAGE_PROVIDER` selects the backend: `supabase` needs `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` (declared optional in `src/env.ts`, required by `getStorageBackend()`); `rustfs` needs `RUSTFS_ENDPOINT`, `RUSTFS_BUCKET`, `RUSTFS_ACCESS_KEY`, `RUSTFS_SECRET_KEY`, and `RUSTFS_PUBLIC_URL` (`RUSTFS_REGION` defaults to `us-east-1`). Create the Supabase bucket with `pnpm run storage:setup` (public access, 5 MiB and the MIME types in `src/lib/server/modules/storage/rules.ts`); the RustFS/S3 bucket must allow anonymous reads (public policy) because uploads set `acl: public-read`. Local HTTP testing needs `BETTER_AUTH_URL` set to the same origin as the page, otherwise `/api/auth/*` 404s and same-origin form POSTs get 403 CSRF.

## Deployment

Deploys to Netlify from git (`netlify.toml`: `pnpm run build`, publish `build`, Node 22). Use the Supabase profile (`env.supabase.example`) because Netlify's function filesystem is ephemeral, so SQLite cannot be used. Set the env vars in the Netlify site settings (make sure they are available to Functions/runtime, not only builds), and run `pnpm run db:push` once against the Supabase database from a local machine (the build does not migrate). The VPS profile is not supported on Netlify.

Netlify functions cap request bodies at about 6 MB (synchronous invocations), above the upload endpoint's 5 MiB limit. `BODY_SIZE_LIMIT` does not apply on Netlify. `vite dev` has no body limit.

`BETTER_AUTH_URL` must match the public Netlify origin.
