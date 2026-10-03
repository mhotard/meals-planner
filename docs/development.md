# Development workflow

## First checkout

Use Node 22 or newer; `.nvmrc` selects Node 22 when using nvm. From the repository root:

```bash
nvm use                  # optional if Node is already installed
npm ci
cp .env.example .env.local
npm run db:migrate
npm run user -- you@example.com "Your Name" your-password
npm run seed             # optional sample recipes and purchasing rules
npm run dev
```

Open http://localhost:3000 and sign in with the account you created.
No hosted database is required. With `DATABASE_URL` blank, the app uses `.pglite/`.
CLI scripts load the same `.env*` configuration as Next.js through `scripts/env.ts`;
values explicitly supplied in the shell take precedence. Run commands from the
root so environment files and migration paths resolve correctly.

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Session signing secret; required in production, at least 32 UTF-8 bytes of securely generated randomness. Generate with `openssl rand -base64 32`. Development has an insecure local fallback. |
| `DATABASE_URL` | Hosted Postgres connection string. Blank/unset selects local PGlite. |
| `PGLITE_DIR` | Optional local database directory; defaults to `.pglite`. Ignored when `DATABASE_URL` is set. |

Only `.env.example` is committed. Keep actual credentials in `.env.local` or the
deployment environment. Do not prefix database URLs or signing secrets with
`NEXT_PUBLIC_`.

## Verify a change

```bash
npm run check            # lint + fresh route types + TypeScript + all tests
npm run build            # production compilation, including server/client boundaries
```

Individual commands are `npm run lint`, `npm run typecheck`, and `npm test`.
Typechecking runs `next typegen` first so fresh checkouts do not depend on stale
`.next` route types. Tests use Node's built-in runner with the existing `tsx`
dependency; no separate test framework is required.

Tests and database commands run TypeScript through `node --import tsx`, avoiding
the extra IPC listener created by the `tsx` CLI in restricted agent environments.

Unit tests cover domain behavior in `tests/unit`. Integration tests create,
migrate, reopen, and remove a fresh PGlite directory under the system temporary
folder. They explicitly clear `DATABASE_URL`, do not load `.env` files, and never
use your household database. Add focused tests for behavior changes rather than
tests that only assert filenames or implementation details.

`check` does not replace a production build or browser smoke test. Build checks
also detect invalid server/client imports. Google Fonts in the root layout are
downloaded during compilation; font download errors require network access.
If a restricted environment prevents Turbopack from starting its workers, use
the documented alternate compiler: `npm run build -- --webpack`. Record which
build mode was verified. For persistent offline development, a separate change
can bundle fonts with `next/font/local`.

The development equivalent is `npm run dev -- --webpack` if Turbopack workers
are restricted. Starting either development server still requires permission
to listen on a local HTTP port in a sandboxed environment.

## Database changes

Stop the dev server before migrating, seeding, or creating users against the
same PGlite directory. Each directory supports one process at a time.

1. Edit `src/db/schema.ts`.
2. Run `npm run db:generate` and inspect the generated SQL and metadata.
3. Run `npm run db:migrate` against a disposable database first.
4. Run `npm run check` and smoke test the affected screens.
5. Commit the new migration with its schema and application changes.

Do not rewrite previously applied migrations or use schema-push commands as a
replacement for versioned migration history. `npm run user` creates an account
or resets an existing email's password. `npm run seed` skips existing recipes
by name, but it updates purchasing rules for the sample ingredients; use it on
a disposable database for previews.

## Disposable manual preview

In a terminal used just for the preview:

```bash
export DATABASE_URL=
export PGLITE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/meals-planner-preview.XXXXXX")"
npm run db:migrate
npm run user -- preview@example.com "Preview User" preview-only-password
npm run seed
npm run dev -- --port 3001
```

These shell values override `.env.local`. Use http://localhost:3001.
Stop the preview before deleting its temporary directory or running more
database scripts. The default household database stays in `.pglite/`.

For a production build, run `npm run build`. Production runtime requires a
hosted `DATABASE_URL` and a securely generated `AUTH_SECRET`; it fails instead
of falling back to local PGlite. Use the disposable development preview above
for local HTTP flows. Production cookies are secure: task 06 verifies authenticated
production flows on HTTPS staging with a separate hosted database. Never disable
cookie security to get a local pass.

## Browser smoke checks

Check the flow relevant to your change; run the full list for broader changes:

- Visit a private route while signed out; confirm redirection to login.
- Sign in, search recipes, create/edit a recipe, and verify notes and cook logs.
- Create a Monday-based plan, add a recipe and a custom meal, and reload.
- Open shopping; verify weekly items, combined units, and pantry prompts.
- Check/skip an item, restore it, add an extra, and confirm persistence on reload.
- Open a share link in a signed-out browser; confirm it is read-only.
- Verify text/Trello copies, print layout, and narrow-screen usability when affected.
- Sign out and confirm private actions/pages remain protected.

## Working across agent sessions

Keep root `AGENTS.md` short and actionable. Put durable architectural decisions
in `docs/architecture.md`, operational instructions here, and long-running task
state under `docs/tasks/`. `CLAUDE.md` imports the shared instructions so they
do not drift between agents. Task notes should include observable acceptance
criteria and exact verification results, not just a list of edited files.

For the hosted-release plan, start with [the roadmap](roadmap.md), then use
[coordination](coordination.md) and the [task board](tasks/README.md). Keep shared
files under one owner at a time and verify the integrated candidate at each gate.

## Login and account changes

Member/CLI setup use a normalized email and a password of at least eight characters
and at most 72 UTF-8 bytes (bcrypt limit). Passwords are not trimmed.
Changing a password or resetting it through the CLI revokes all prior sessions.
Existing cookies from before migration0001 require a fresh login.
Ten failed password checks lock a normalized email for the rest of a fixed
fifteen-minute window; the next eligible attempt resets the window.
Hashed limiter rows persist, including missing accounts; hosted operations must
monitor growth and can clean expired windows without deleting active ones.
