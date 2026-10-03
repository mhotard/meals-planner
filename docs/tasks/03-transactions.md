# 03 — Make recipe saves atomic

Status: in_progress. Owner: /root/auth (persistence assignment).
Dependencies: accepted02. Branch: codex/03-transactions.
Worktree: /private/tmp/meals-task03.
Baseline: ff5eae305d33ddf5549335bfdbadb15b29d5c5e4 (accepted01/02).

## Goal and ownership

Failed saves must leave no partial recipe, missing ingredient list, or orphaned
new ingredient. Own recipe actions, `src/db/ingredients.ts`, narrowly scoped
persistence helpers, and integration tests. Consume 02's validation contract;
request shared/schema locks before expanding scope.

## Plan

1. Validate the full payload before starting a real Drizzle transaction.
2. Include recipe insert/update, old-line replacement, canonical ingredient
   creation, and every new-line insert in the same transaction.
3. Make ingredient helpers accept connections and transaction query interfaces
   without unsafe compatibility casts; preserve CLI use and server/client boundaries.
4. Make case-insensitive ingredient creation conflict-safe under concurrency.
   Missing update targets must produce controlled errors, not orphaned rows.
5. Keep cache invalidation and redirects after commit; do not catch Next redirects
   as database failures.
6. Test rollback through a real failing constraint or controlled test seam,
   never a production-accessible failure switch. Schedule Postgres parity in 06.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 03.1 | Failed update preserves old recipe and all old lines | Mid-write failure; full before/after row comparisons |
| 03.2 | Failed create leaves no recipe/lines/new ingredients | Rollback test on migrated disposable PGlite |
| 03.3 | Saves persist all rows; concurrent creation yields one canonical ingredient | Integration tests plus recipe create/edit/reload flow |
| 03.4 | Shared CLI helper remains usable | Disposable migration/seed smoke; `npm run check` and build |

## Handoff and acceptance

Results: not run. Return commit/diff, transaction interface, failure method,
checks, and driver assumptions for 06. Task 04 reruns recipe flows after
integration. Coordinator acceptance: pending.
