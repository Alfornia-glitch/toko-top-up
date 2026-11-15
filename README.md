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
