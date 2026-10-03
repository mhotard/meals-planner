<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working on Meal Planner

This is an existing family meal planner. Extend the working application and
preserve its routes and household data. Stack: Next.js App Router, TypeScript,
React, Tailwind CSS, Drizzle, and Postgres/PGlite. Use npm and the committed lockfile.

## Start here

1. Read `README.md` for setup and product behavior.
2. Read `docs/architecture.md` for code ownership and domain constraints.
3. Read `docs/development.md` for verification and database workflows.
4. Read `docs/roadmap.md` and `docs/coordination.md` for planned release work.
5. Check `git status --short` and the task board in `docs/tasks/README.md` before editing.

Read the installed Next.js guide relevant to your change, especially
`01-app/01-getting-started/02-project-structure.md`,
`01-app/01-getting-started/05-server-and-client-components.md`, and
`01-app/01-getting-started/07-mutating-data.md` under the docs directory above.

## Where code belongs

| Path | Responsibility |
| --- | --- |
| `src/app/` | Routes, layouts, route-specific UI, and `actions.ts` server actions |
| `src/server/` | Server-only queries, sessions, request helpers, shopping-list builder |
| `src/db/` | Schema, connections, and database helpers shared with CLI scripts |
| `src/lib/` | Framework-independent types and pure domain utilities |
| `src/components/` | UI used by multiple routes |
| `src/hooks/` | Browser-facing React hooks |
| `scripts/` | Database migration, account setup, demo seed; import `./env` in CLI entry points |
| `tests/unit/` | Pure domain behavior, using Node's test runner |
| `tests/integration/` | Database behavior against disposable PGlite directories |
| `drizzle/` | Generated SQL migrations and their metadata |
| `docs/tasks/` | Plans and handoff notes for work spanning several sessions |

Use `@/` for imports across source folders and relative imports within a folder.
Import shared types with `import type`. Keep `src/lib` free of Next.js, React,
database access, and secrets. Add `import "server-only"` to `src/server` modules;
keep CLI-compatible database modules free of that marker. Use explicit imports
instead of creating a barrel that mixes server and browser code.

Keep feature forms and actions beside their routes. Add a subfolder when it has
real contents; avoid empty scaffolding and premature abstractions.

## Behavior to preserve

- All accounts share one household. Public share links are read-only.
- Authenticate every private page and server action with `requireUser()`;
  the proxy is an additional gate, not a substitute for action authorization.
- Plans use Monday dates as `YYYY-MM-DD` strings and day indexes 0–6.
- Ingredient names are case-insensitively unique. Use the shared lookup helper.
- Combine quantities only within a unit family; preserve count-unit distinctions.
- Shopping lists are derived from plans. Store checked/excluded overrides under
  stable item keys, and keep pantry prompts separate from purchases.

## Development and completion

Run `npm run check` after code changes. It runs ESLint, generates fresh Next.js
route types, checks TypeScript, and runs unit/integration tests. For route,
component, or server-boundary changes, also run `npm run build` and perform the
relevant browser smoke checks in `docs/development.md`. Document any unavailable
checks instead of claiming they passed.

Never use the real `.pglite/` directory for automated tests. For manual previews,
set `DATABASE_URL=` and a disposable `PGLITE_DIR` before migrating or seeding.
PGlite supports one process per directory: stop the preview before running
database scripts. Do not delete the household database to fix a build issue.

Schema changes require `npm run db:generate` and a new committed migration.
Preserve existing migrations and unrelated user changes. Keep credentials and
local data out of Git. Update the relevant docs when setup or architecture changes.
For longer work, use `docs/tasks/TEMPLATE.md` to record acceptance criteria,
decisions, progress, and verification so another agent can continue.
For coordinated work, claim a bounded packet through the coordinator, respect
exclusive file ownership, and leave acceptance to integrated review. Preserve
the local restructuring in the task 00 baseline before starting isolated workers.
