# 09 — Preview quantities for a different serving count

Status: proposed (optional). Owner: unassigned (recipes).
Dependencies: accepted 07/G3 and household selection. Branch/worktree: unassigned.

## Goal and ownership

Adjust displayed amounts without overwriting the original recipe. Own a pure
scaling helper, recipe-detail controls, and tests. Serialize recipe UI with 08.
Proposed version one scales the recipe display only; shopping demand stays
unchanged until a separate planned-servings model is designed and selected.

## Plan

1. Confirm display-only scope. Require positive integer target/base servings;
   recipes without a base count explain that it must be supplied before scaling.
2. Multiply numeric quantities by target/base, preserving unspecified quantities,
   units, notes, and stored values. Use current fraction formatting without
   rounding the underlying recipe data.
3. Add accessible controls and Reset to original. Label the result as a preview
   so it is not mistaken for saved shopping quantities.
4. Test fractions, small amounts, count units, unknown quantities, invalid targets,
   and repeated scale/reset interactions.
5. If shopping scaling is requested, first create a separate packet defining
   per-plan-entry servings, legacy defaults, repeated-recipe demand, weekly
   minima, stable override keys, migration, and exports.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 09.1 | Scaling from 4 to 6 applies 1.5 correctly and preserves unknown quantities/units | Pure fixtures and edge cases |
| 09.2 | Reset/reload returns originals; stored recipes/plans do not change | Browser flow and before/after DB assertions |
| 09.3 | Scope is clear; existing shopping semantics still pass | `npm run check`, E2E delivered by 04, build, mobile/keyboard smoke |

## Handoff and acceptance

Results: not run. Return scope decision, display rules, commit/results, UI
evidence, and any separate shopping-integration proposal. Acceptance: pending.
Not required for the initial hosted release.
