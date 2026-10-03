# Architecture

## Directory map

```text
meals-planner/
├── AGENTS.md               # Shared instructions for coding agents
├── CLAUDE.md               # Imports AGENTS.md for Claude
├── README.md               # Product overview and quick start
├── .env.example            # Committed environment template; no real secrets
├── .nvmrc                  # Node 22 development target
├── docs/
│   ├── architecture.md     # Code boundaries and domain rules
│   ├── development.md      # Setup, checks, smoke testing, troubleshooting
│   ├── roadmap.md          # Release milestones and optional features
│   ├── coordination.md     # Agent ownership, dispatch, review, and handoff
│   └── tasks/              # Live board, bounded work packets, handoff template
├── src/
│   ├── app/
│   │   ├── (app)/          # Private routes and household navigation
│   │   │   ├── page.tsx    # Dashboard
│   │   │   ├── recipes/    # Recipe CRUD, notes, cook logs
│   │   │   ├── plans/      # Weekly plans, sharing, shopping
│   │   │   ├── pantry/     # Canonical ingredients and purchasing rules
│   │   │   └── settings/   # Household members and passwords
│   │   ├── login/          # Sign-in page and session actions
│   │   ├── share/[token]/  # Public read-only plan and shopping list
│   │   ├── layout.tsx      # Document shell, metadata, font setup
│   │   └── globals.css     # Theme, shared styles, print styles
│   ├── components/         # Shared forms, lists, copy controls, navigation
│   ├── hooks/              # React hooks, currently clipboard behavior
│   ├── lib/                # Pure types, dates, units, grouping, exports
│   ├── server/             # Auth, request origin, database-backed queries
│   ├── db/                 # Drizzle schema, drivers, ingredient lookup helpers
│   └── proxy.ts            # Early route protection
├── scripts/                # Environment loader, migrations, users, demo data
├── tests/
│   ├── unit/               # Date/week, quantity, grouping, export behavior
│   └── integration/        # Isolated database migration and persistence checks
├── drizzle/                # SQL migration history and Drizzle metadata
└── public/                 # Static assets
```

Configuration files and the npm lockfile stay at the root. `.next/`,
`node_modules/`, `.pglite/`, real `.env` files, and TypeScript build caches are
local generated state, excluded from Git.

## Module boundaries

Pages and layouts are Server Components by default. They authenticate, call
`src/server` queries, and pass serializable data and server actions to Client
Components. Route-specific forms, pickers, and `actions.ts` files stay beside
the feature's pages. Share UI in `src/components` when several routes need it.

`src/server` contains code that reads request state, handles sessions, or queries
the database. Every module uses `server-only` to prevent accidental browser
imports. These modules use `src/db` and pure `src/lib` helpers.

`src/lib` contains code that can run in the browser, server, or test runner.
In particular, `lib/plans.ts` owns `PlanEntry` and day grouping, and
`lib/shopping.ts` owns `ShoppingItem`, aisle grouping, and pantry partitioning.
Their database-backed counterparts live in `server/plans.ts` and
`server/shopping.ts`. Exports can therefore format lists without opening a
database or importing the Next.js runtime. ESLint rejects framework and
database imports in `src/lib`.

`src/hooks` contains React hooks used by Client Components. A Client Component
may import a route's `"use server"` actions; it must not import server query
modules or database drivers. Prefer importing DTO types from `src/lib`.

`src/db/index.ts` is the server-only application entry point. It caches the
connection promise across development hot reloads. CLI scripts and integration
tests instead import `src/db/create.ts`, own the connection, and close it when
finished. `src/db/ingredients.ts` accepts a database explicitly so both scripts
and the app can use the same case-insensitive lookup rules.

## Request and mutation flow

1. `src/proxy.ts` checks the session cookie before private routes.
2. Private pages and server actions also call `requireUser()`.
3. Pages read through `src/server`; actions validate form fields and write via Drizzle.
4. Actions invalidate affected routes with `revalidatePath()` or redirect.
5. Shared Client Components provide interactive forms and optimistic controls.

The read-only `/share/[token]` route intentionally skips login and resolves a
plan through its secret token. It renders controls without mutation actions.
Never expose account settings or write actions through that route.

## Data and product constraints

- **Household:** all users share the same data. There is no household/tenant id.
  Adding multi-household support would require explicit data isolation work.
- **Recipes:** canonical ingredients connect through recipe ingredient rows;
  quantities use numeric columns and unit strings. Cook logs record a date,
  optional user, rating, and note.
- **Plans:** one plan per Monday date; entries use indexes 0–6 and either a
  recipe or a free-form label. Share tokens identify public read-only views.
- **Ingredients:** names are unique ignoring case; categories describe grocery
  aisles. Supply is `weekly`, `pantry`, or `per_recipe`.
- **Shopping:** the builder deduplicates planned recipe IDs, combines compatible
  quantities, and adds weekly items. Weekly amounts are a minimum, rather than
  an extra amount added to recipe demand. Pantry items start excluded and appear
  as prompts. Extras are independent rows.
- **State:** shopping lists are rebuilt on reads. Stable `ing:<id>:<unit-group>`
  and `extra:<id>` keys retain checked/excluded overrides after recipe changes.
- **Units and dates:** mass and volume convert within their own families;
  count units combine only with identical units. Week math uses local calendar
  dates represented as strings, with Monday as the first day.

The schema is authoritative in `src/db/schema.ts`. `drizzle.config.ts` points to
it and generates migrations into `drizzle/`; runtime migrations apply that
history through the selected driver. Set `DATABASE_URL` to use hosted Postgres;
otherwise PGlite stores local Postgres data in `.pglite/` or `PGLITE_DIR`.
