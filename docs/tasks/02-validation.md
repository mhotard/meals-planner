# 02 — Validate mutation inputs before writes

Status: queued. Owner: unassigned (domain validation).
Dependencies: accepted 00. Branch/worktree and baseline commit: unassigned.

## Goal and ownership

Reject invalid input with visible feedback while preserving supported fractions
and optional fields. Own `src/lib/form.ts`, pure domain validators, recipe/pantry/
plan actions and affected UI, plus tests. Login/settings belong to 01. Obtain a
lock before schema edits. Recipe actions transfer to 03 after integration.

## Plan

1. Inventory exported mutations; define missing/invalid distinctions, numeric
   bounds/precision, text limits, positive IDs, enum/unit policies, real dates,
   and ratings. Record whether zero quantities are meaningful.
2. Reject zero-denominator fractions, non-finite values, and unsupported formats.
   Invalid input must not silently become a blank nullable field.
3. Validate integer servings/prep minutes, permitted quantities, real cook dates,
   ratings, HTTP(S) source links, and all parallel ingredient arrays before writing.
4. Validate week/day/entry IDs and shopping keys; scope entry/extra/state updates
   to the selected plan. Reject crafted supply/category values instead of silently
   applying fallback purchasing rules.
5. Validate first, then mutate. Surface errors through consistent form results
   and preserve successful redirect/revalidation behavior.
6. Add pure edge cases and action-level no-write assertions. Publish validated
   recipe input/result types and policy for 03; coordinate auth helpers separately.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 02.1 | Fractions work; `1/0`, `1 1/0`, Infinity/NaN and invalid IDs/dates/URLs fail | Pure tests covering blank/invalid distinction and bounds |
| 02.2 | Rejected inputs leave all related rows unchanged | Isolated mutation tests with before/after DB assertions |
| 02.3 | Crafted arrays/enums/plan identifiers cannot cause unintended writes | Boundary tests, including mismatched plan/entry IDs |
| 02.4 | Forms explain invalid input and still accept valid input | Recipe/pantry/plan browser checks with synthetic screenshots |
| 02.5 | Contract is ready for persistence work | `npm run check`, build, published contract; coordinator accepts before 03 |

## Handoff and acceptance

Results: not run. Return policy table, helpers/types, commit/diff, exact tests,
UI evidence, and deliberate blank/zero behavior changes. Acceptance: pending.
