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

Requires Bun >= 1.4.2. The build uses `@sveltejs/adapter-vercel`, which writes `.vercel/output/`. Run it under Bun so the adapter selects the Bun runtime:

```sh
bun run --bun build
bun run preview
```

## Deploying (Vercel)

The app deploys to Vercel from git. `vercel.json` sets `bunVersion` to `1.4.x`, so Vercel runs the server functions on Bun (beta runtime).

Use the Supabase profile (`env.supabase.example`) in the Vercel project settings. SQLite needs a persistent disk, and Vercel's disk is ephemeral. Set `DB_PROVIDER=postgres`, `STORAGE_PROVIDER=supabase`, `DATABASE_URL`, the `SUPABASE_*` variables, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` (the public Vercel origin).

Run `bun run db:push` once against the Supabase database from a local machine. The build does not migrate.

The VPS profile is not supported on Vercel.
