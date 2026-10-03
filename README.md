# Meal Planner

A private family meal planner: keep your recipes, plan a week, and turn that
week into a shopping list you can share or paste into Trello.

## What it does

- **Recipes** — ingredients with real quantities and units, a source link, and
  free-form notes ("halve the chili next time").
- **Cook log** — record the nights you actually made something, with an optional
  rating and note. The home page surfaces what's in rotation and what you
  haven't made in a while.
- **Shopping** — every ingredient, sorted into how you actually buy it:
  **every week** (milk, bread, eggs) lands on every list automatically;
  **pantry** (olive oil, rice, spices) stays off the list and appears as a
  "check you have enough" prompt when a recipe needs it; everything else is
  bought only when a recipe calls for it.
- **Weekly plans** — assign recipes to days, or type free-form entries like
  "leftovers" or "pizza out".
- **Shopping list** — combines the week's ingredients (adding up compatible
  units, so 2 lb + 8 oz becomes 2.5 lb), adds the every-week items, and groups
  everything by grocery aisle. Check items off, skip what you already have, add
  one-off items. Pantry items the week's recipes use sit in a separate "check
  the pantry" strip — one tap moves any you're low on onto the list.
- **Sharing** — every week gets a secret read-only link that needs no login,
  plus copy-as-text and Trello-shaped exports, plus a print view.
- **Logins** — email + password, two or more accounts, all sharing one
  household's recipes and plans.

## Running it locally

```bash
npm ci                # Node 22+; optionally select it with nvm use
cp .env.example .env.local
npm run db:migrate     # creates the local database in .pglite/
npm run user -- you@example.com "Your Name" your-password
npm run seed           # optional: sample recipes and staples
npm run dev
```

Then open http://localhost:3000.

For coding agents, start with [AGENTS.md](AGENTS.md). The
[architecture map](docs/architecture.md) explains where to put code; the
[development runbook](docs/development.md) covers checks, database changes, and
disposable previews. Use [task notes](docs/tasks/README.md) for work spanning sessions.

The [roadmap](docs/roadmap.md) lays out release milestones and optional feature
work. The [coordination guide](docs/coordination.md) provides agent ownership,
dispatch order, verification gates, and copyable handoff prompts.

With no `DATABASE_URL` set, the app runs on **PGlite** — a real Postgres
compiled to WebAssembly, stored in `.pglite/`. Nothing to install.

> **One process at a time.** PGlite can only be opened by a single process.
> Stop `npm run dev` before running `db:migrate`, `user`, or `seed`, or the
> scripts will refuse to start. This restriction disappears once `DATABASE_URL`
> points at a hosted Postgres.

## Deploying

Hosting is pending; no production URL has been verified. Follow the
[deployment runbook](docs/deployment.md) and [operations runbook](docs/operations.md)
for the reviewed candidate, separate staging/production environments, account
and budget choices, migrations, backup/restore rehearsal and HTTPS smoke checks.

Production requires a hosted `DATABASE_URL` and a securely generated
`AUTH_SECRET` of at least 32 UTF-8 bytes (for example `openssl rand -base64 32`).
It rejects missing configuration instead of opening local PGlite. Store secrets
in the selected provider's scoped settings. Apply committed migrations once
through the named operator; builds and app startup do not migrate the database.

New household members can also be added from **Settings** once you're signed in.
The [household guide](docs/user-guide.md) explains recipes, weekly plans and shopping.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run check` | Lint, fresh route types, TypeScript, and isolated tests |
| `npm run test:e2e` | Chromium household/action tests with fresh synthetic databases |
| `npm run test:production-config` | After a build, verify missing production config fails closed |
| `npm run lint` / `npm run typecheck` / `npm test` | Run individual checks |
| `npm run db:generate` | Generate a SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run user <email> <name> <password>` | Create or reset a login |
| `npm run seed` | Add sample recipes and staples |

## Layout

```
src/
  app/(app)/        signed-in pages: home, recipes, plans, pantry, settings
  app/login/        sign in
  app/share/[token] public read-only week
  components/       shared UI (form primitives, shopping list, copy buttons, nav)
  hooks/            browser-facing React hooks
  db/               Drizzle schema, connections, ingredient helpers shared with scripts/
  lib/              pure types, units, dates, grouping, form parsing, exports
  server/           server-only sessions, queries, request helpers, shopping-list builder
  proxy.ts          route protection
scripts/            environment loading, migrate, seed, create user
tests/unit/         domain behavior tests
tests/integration/  migrations and persistence on disposable databases
docs/               architecture, development workflow, task notes
drizzle/            generated SQL migrations
```

Run `npm run check` before completing a code change, and `npm run build` for
production compilation. The build needs network access to download the current
Google Fonts. Automated database tests always use a temporary directory and
never open your household's `.pglite/` database.

### Notes on a couple of decisions

- **Units.** Quantities are stored as a number plus a unit. The shopping list
  adds up units within the same family (mass, volume) and renders the total in
  the largest unit you actually wrote down. Count-ish units ("clove", "can")
  only combine with themselves, which avoids nonsense totals.
- **Shopping-list state.** The list is recomputed from the plan every time, so
  editing a recipe updates it. Only your overrides — checked, skipped, and
  ad-hoc additions — are stored, keyed to a stable id per line.
