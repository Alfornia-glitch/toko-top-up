# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
bunx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bunx sv@0.17.1 create --template minimal --types ts --add prettier tailwindcss="plugins:none" sveltekit-adapter="adapter:bun" --install bun ImplementPrototypeUI-svelte
```

## Developing

Once you've created a project and installed dependencies with `bun install` (run it from this directory), start a development server:

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev --open
```

## Building

Requires Bun >= 1.4 (adapter-bun uses `Bun.build`). Build and run the production server:

```sh
bun run --bun build
bun ./build
```

`bun run preview` is an alias for `bun ./build`. The server listens on port 3000 by default (`HOST` / `PORT` override it) and serves both the SPA shell and `/api/auth/*`.

## Deploying

Copy `build/`, `package.json`, and `bun.lock` to the server, install production dependencies, then start the server:

```sh
bun install --production --frozen-lockfile
bun ./build
```

Set the environment from one of the two profiles, then run the one-time schema sync:

- **VPS** — copy `env.vps.example` to `.env` (`DB_PROVIDER=sqlite`, `STORAGE_PROVIDER=rustfs`). The database is a local SQLite file at `SQLITE_PATH`; media goes to a RustFS/S3-compatible endpoint.
- **Supabase** — copy `env.supabase.example` to `.env` (`DB_PROVIDER=postgres`, `STORAGE_PROVIDER=supabase`). `DATABASE_URL` is the Supabase session-pooler connection string (`sslmode=require`); Better Auth tables are created in the private `auth_app` schema, which `bun run db:push` creates without opening the dashboard.

Both profiles need `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Run `bun run db:push` once to create the database/schema and tables.

When serving plain HTTP directly (for example a local preview), build with `ORIGIN=http://localhost:3000 bun run --bun build`; behind TLS, leave `ORIGIN` unset.
