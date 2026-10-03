# 02 — Validate mutation inputs before writes

Status: accepted. Owner: coordinator-dispatched validation subagent.
Dependencies: accepted 00/G0. Branch: `codex/02-validation`.
Worktree: `/private/tmp/meals-task02`.
Baseline: `868d22614355dac71ee3a72dd63cda51cdfd1e30`.
Implementation: `b5898a4431eabdd2931d259872fcb53b9ca2cb10`.
Reviewed missing-ID fix: `e06958590496cba3b26f0cac8f7b09e212df61f0`.
Reviewed unit conversion fix: `9bf44293da038c2cffada02881db6fcb66746bba`.
Coordinator accepted October 3, 2026 on integrated source `4aecd2a4f615be2543453e096ea0ac8d6423a179`.

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

Implementation reviewed locally on October 3, 2026 (America/New_York); returned
for coordinator review, not accepted. No schema, migration, auth/settings, or root
configuration changes. The coordinator also granted `src/lib/units.ts` and its
unit test for the custom-unit conversion defect identified during independent
review. Related forms, shopping/pantry controls, inline notes,
and the dashboard plan-creation form now display expected input errors.

### Published input contract

`src/lib/validation.ts` exports `validateRecipeInput(FormData)` returning
`ValidationResult<ValidatedRecipeInput>` from `src/lib/form.ts`:
`{ ok: true, value }` or `{ ok: false, error }`. The successful value contains
`name`, nullable `description`, `notes`, `sourceUrl`, integer nullable `servings`
and `prepMinutes`, and `ingredients` with `name`, numeric-string/null `quantity`,
normalized string/null `unit`, and string/null `note`.

Task 03 should validate the whole form and any supplied recipe ID before writes,
then consume this contract inside its transaction. Redirects and revalidation
stay outside persistence. Existing recipe IDs are checked for existence. This
packet intentionally leaves recipe writes non-atomic for task 03.

| Input | Policy |
| --- | --- |
| Scalar fields | One string value; reject duplicate values and files. Trim whitespace; blank optional fields become null. Reject control characters and excessive lengths. |
| Names/meal/extra labels | Required; max 200 characters. Completely blank ingredient rows may be omitted; populated rows require a name. |
| Description / recipe and plan notes / cook notes / ingredient note | Max 2,000 / 10,000 / 2,000 / 1,000 characters. |
| Ingredient arrays | All four arrays have identical lengths, max 100; every row validates before any recipe or ingredient write. |
| Quantities | Blank means unspecified; zero/negative values are rejected. Decimal, proper/improper fraction, and mixed fraction formats supported; no exponent, hex, nonfinite, zero-denominator, or arbitrary number coercion. |
| Quantity precision | Numeric(10,3) recipe/extras, Numeric(10,2) weekly amounts. Decimal input must fit scale; fractions round explicitly to storage scale. Reject values above storage maximum or rounding to zero. |
| Servings / prep minutes | Optional whole decimal integers, 1–1,000 / 0–10,080; zero prep minutes is meaningful. |
| IDs / day indexes | Positive integer IDs within Postgres integer range; day integers 0–6 only. |
| Cook/date/week | Required real YYYY-MM-DD dates, years 1000–9999; week starts must be Mondays. The cook form supplies today, but crafted blank dates no longer silently select today. Generated week cook dates validate before the bulk insert. |
| Rating | Blank means unrated, otherwise integer 1–3 (existing UI scale). |
| Source URLs | Blank or absolute HTTP(S); max 2,048 characters, no embedded credentials or whitespace/control characters. |
| Units | Blank or normalized lowercase custom count/unit string, max 40; letters, digits, spaces, and simple punctuation. Preserve custom count units rather than coercing to a known family. |
| Category/supply | Require existing exact enums. Crafted values do not silently default to other/per_recipe. |
| Shopping state | Nonempty checked/excluded boolean patch, no extra keys; key must identify an item currently derived for the selected plan. |
| Scoped rows | Entry/extra deletion requires selected plan membership; cook-log deletion requires selected recipe membership; weekly amount edits require an existing weekly ingredient. |

Expected input errors return `{ error: string }`, and success preserves existing
redirect/revalidation behavior. Unexpected database/runtime errors propagate.
Independent review found and fixed two defects before acceptance: crafted
`updateRecipe` calls with a missing ID now fail the update action's unconditional
ID guard instead of entering the create path; conversion lookups now use own
properties, so custom unit names such as `constructor` cannot produce undefined
families or nonfinite totals. The runtime missing-ID regression is assigned to
task 04; `tests/unit/units.test.ts` covers prototype names, grouping, finite
quantities, and mixed known/custom conversion selection.

All writes remain protected by `requireUser()` before validation or database
access, directly or through authenticated route helpers. `ActionForm` restores
rejected uncontrolled input after React's form reset; recipe fields are
controlled, and event-based picker/shopping controls surface errors.

### Verification evidence

Environment: isolated baseline worktree on macOS Darwin arm64; Node `v25.5.0`,
npm `11.8.0`, installed Next.js `16.3.0`. Installed guides for project structure,
server/client components, and mutations read before edits. Database test runner
creates disposable PGlite directories; no household database or hosted database
was opened. Build explicitly used `DATABASE_URL=` and disposable
`PGLITE_DIR=/private/tmp/meals-task02-build`.

| Command / check | Result | Evidence / scope |
| --- | --- | --- |
| `npm ci` | Exit 0 | Committed lockfile, baseline dependencies; no dependency changes. |
| `npm run check` | Exit 0; lint clean, fresh route types and TypeScript passed; 18/18 tests passed | `tests/unit/validation.test.ts` adds six validation tests; existing unit/integration tests remain passing. Final run used implementation identical to 9bf4429, including the independently reviewed ID/unit fixes. |
| `git diff --check` | Exit 0 | Whitespace check before implementation commit. |
| `DATABASE_URL= PGLITE_DIR=/private/tmp/meals-task02-build npm run build -- --webpack` (restricted sandbox) | Exit 1 | DNS `ENOTFOUND fonts.googleapis.com`; Google Fonts download unavailable. This attempt was not a pass. |
| Same production build with approved network access, Webpack | Exit 0 | Production compilation, TypeScript, all route collection/static generation and server/client boundaries passed on b5898a4 and e069585; final 9bf4429 rerun also passed. |
| Actual exported-action no-write assertions (02.2/02.3) | Pending | Task 04 provides actual Next Flight action replay with real authentication and database before/after snapshots; coordinator must run it on integrated 01/02 candidate before accepting 02 or dispatching 03. |
| Synthetic recipe/pantry/plan desktop/mobile browser checks (02.4) | Pending | Task 04 browser harness; no screenshots or manual browser passes claimed by this worker. |

02.1 passes locally. 02.2, 02.3, and 02.4 remain pending integrated runtime
verification; 02.5 has the contract and local checks/build but requires coordinator
acceptance. Shared task board/roadmap remain coordinator-owned.

Next action: integrate this implementation and task 04's scaffold with task 01,
run authenticated invalid-input cases and before/after assertions, review visible
errors and valid fraction/date flows, then accept 02 and transfer recipe actions
to task 03. Fix any defects found in that review before acceptance.

### Coordinator acceptance — October 3, 2026

All local milestones02.1–02.5 accepted; recipe actions transfer to03. Independent
review fixes for missing update ID and inherited unit names are integrated.
Task04 uses installed React encoding and parses the actual action result;
37 crafted-invalid calls produced errors with unchanged domain/full-user digests,
including true undefined update ID, malformed arrays and cross-plan IDs.
The initially copied Flight encoding/whole-body error assertion were defective
test code and were corrected before acceptance.

Coordinator environment: macOS arm64, Node25.5.0/npm11.8.0/Next16.3.8,
Chromium headless, development Webpack, desktop1280×900, per-test temporary
PGlite and random synthetic accounts. No household database opened.

| Exact command | Commit / result |
| --- | --- |
| npm run check | daad802; exit0, lint/fresh route types/TypeScript and 24/24 tests |
| npm run test:e2e -- tests/e2e/action-guards.spec.ts tests/e2e/household.spec.ts --grep 'crafted invalid\|custom count units\|recipe create\|weekly item retains' | daad802; exit1, 3 passed (crafted no-write28.0s, recipe error/correction/CRUD16.6s, pantry/plan error/correction11.9s), custom positive failed obsolete whole-response assertion |
| npm run test:e2e -- tests/e2e/action-guards.spec.ts --grep 'custom count units' | 4aecd2a; exit0, 1/1 (15.0s); actual creation, plan membership, finite 2 constructor shopping quantity and stable checked override after reload |

The failed assertion above is fixed in4aecd2a; all affected checks pass.
Webpack production compilation already passed on identical application source
(task06 preparation). Task04's additional targeted runtime evidence records
exact worker commands/SHAs; its final stability gate awaits03 integration.
