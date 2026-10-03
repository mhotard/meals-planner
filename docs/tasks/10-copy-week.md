# 10 — Copy an earlier plan into a new week

Status: proposed (optional). Owner: unassigned (plans).
Dependencies: accepted 07/G3 and household selection. Branch/worktree: unassigned.

## Goal and ownership

Reuse a plan with distinct shopping state and sharing. Own plan actions/UI,
targeted persistence helper, and tests. Request shared/schema locks if needed;
no schema change is expected for the proposed scope.

## Plan

1. Define semantics: copy meal entries, ordering, and notes into an unused Monday
   date. Extras are excluded by default or an explicit option. Never copy
   checked/excluded overrides or cook logs.
2. Authenticate and validate source/destination. If the destination exists,
   surface a conflict and leave it unchanged; no silent overwrite or merge.
3. Create the plan, fresh secret token, and copied rows atomically. Concurrent
   attempts obey the unique-week constraint and return a useful conflict.
4. Add source/destination selection and confirmation summary; revalidate the new
   week/dashboard and recompute shopping from referenced recipes.
5. Cover empty plans, custom entries, unavailable references, failed copies,
   existing destinations, and concurrent requests.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 10.1 | Intended entries/notes copy with a new token; source stays unchanged | Transaction tests comparing complete rows/tokens |
| 10.2 | Shopping/cook state does not leak; conflicts/failures leave no partial plan | State, rollback, and concurrency regressions |
| 10.3 | Copied plan works on mobile and in shopping/sharing | `npm run check`, E2E delivered by 04, build, destination smoke |

## Handoff and acceptance

Results: not run. Return copy semantics, commit, transaction evidence, browser
results, and requests to change merging separately. Acceptance: pending.
Not required for the initial hosted release.
