# 00 — Preserve a reproducible baseline

Status: in_progress. Owner: coordinator (/root).
Dependencies: none. Branch: codex/release-baseline. Baseline commit: pending.

## Goal and ownership

Preserve the local restructuring before workers use isolated checkouts. Own
baseline review, commit selection, the board, and documentation. No features
or hosting changes belong in this packet.

## Plan

1. Inspect status and review tracked/new files; separate unrelated user work.
   Do not reset the dirty tree or indiscriminately stage everything.
2. Review server/lib/hooks boundaries, `.env.example`, CLI environment loading,
   manifest/lockfile agreement, docs, and the existing 11-test suite.
3. Run `npm run check`, production build, and `git diff --check`; record compiler
   mode/environment limitations. Use the documented Webpack option if needed.
4. Preserve reviewed work on `codex/release-baseline` in a commit when execution
   is authorized. Record SHA and reviewed inventory on the board.
5. In a fresh checkout of that commit, run `npm ci`, `npm run check`, and the
   selected build. Verify setup with disposable data and no inherited `.next/`,
   secrets, or `.pglite/`. Stop servers before running database scripts.
6. Record integration branch and ownership; make 01/02/04 scaffold ready after G0.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 00.1 | Relevant work preserved; no user changes discarded or secrets/data staged | Reviewed inventory, diff, baseline SHA |
| 00.2 | Fresh checkout reproduces all checks/build | `npm ci`, `npm run check`, build or documented Webpack option; results tied to SHA |
| 00.3 | Setup works with disposable data | Migration/account/seed/login smoke; cleanup evidence |
| 00.4 | Workers have a common commit and exclusive ownership | Board and lock entries; coordinator accepts G0 |

## Handoff and acceptance

Results: not run for this packet. Return baseline SHA, branches/worktrees,
reviewed inventory, exact check results, setup evidence, defects, and next
dispatch (01/02/04). Historical checks are in the roadmap.
Coordinator acceptance / integrated commit: pending.

## Execution record — October 2, 2026

Reviewed tracked changes and new source/tests/docs. Inventory: server-only
queries/session/request helpers moved from lib to server; browser hook moved to
hooks; ingredient lookup moved to db; pure plan/shopping DTOs retained; imports
updated; CLI env loader, Node engine/lockfile, isolated tests, architecture and
release plans added. Schema changes are comments only. No unrelated changes
identified. No credentials, household database, or generated files staged.

Environment: macOS, Node v25.5.0, npm 11.8.0, Next 16.3.0.
- `npm run check`: exit 0, lint/typegen/TypeScript and 11/11 tests passed.
- `DATABASE_URL= npm run build -- --webpack`: exit 0, all existing routes built.
- `git diff --check`: exit 0.

Fresh-checkout installation/build and disposable setup smoke pending.
