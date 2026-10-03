# 03 — Make recipe saves atomic

Status: accepted. Owner: persistence worker `/root/auth`.
Dependencies: accepted 01/02 on integrated source `4aecd2a4f615be2543453e096ea0ac8d6423a179`.
Branch: `codex/03-transactions`; worktree: `/private/tmp/meals-task03`.
Baseline: `ff5eae305d33ddf5549335bfdbadb15b29d5c5e4`.
Exclusive recipe action/ingredient/persistence/test ownership granted by coordinator;
no shared schema/migration or root configuration grant.

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

Implementation: `ff148edcb5d2ccfab080a9842ac5855efc8742fd`.
Returned for independent integration review; coordinator acceptance is pending.
Changes are limited to recipe actions, the shared ingredient helper, a new
CLI-compatible `src/db/recipes.ts` helper, its transaction integration test,
and this packet. No schema, migration, auth, validation policy, dependency,
root configuration, board or roadmap files were changed.

### Transaction and ingredient contracts

`saveValidatedRecipe(db, input, target)` consumes task 02's
`ValidatedRecipeInput`. Its explicit target is `{ kind: "create" }` or
`{ kind: "update", recipeId }`, and it returns `{ id }` or the controlled missing
update error `{ error: "Recipe no longer exists." }`. Recipe actions authenticate
first and validate the complete form before calling the helper; `updateRecipe`
retains its unconditional positive-ID guard. The persistence helper also checks
an update ID before opening the transaction. It contains no Next.js imports,
request state, failure switch, cache invalidation or redirects.

A real `db.transaction()` at explicit `READ COMMITTED` contains the recipe
insert/update, deletion of old ingredient lines, every canonical ingredient
creation/lookup, and all replacement line inserts. The update uses
`UPDATE ... RETURNING` to lock the target until commit, replacing the earlier
lookup/update race. A missing/deleted target returns before any ingredient
creation or line deletion. Unexpected database errors are not converted into
input success; Drizzle rolls back and the original error propagates.
The actions perform their unchanged redirects/cache invalidation only after
awaiting the committed result, outside the transaction.

Ingredient helpers accept `IngredientQueries = Pick<DB, "select" | "insert">`.
Real connections and Drizzle transaction handles both satisfy this interface;
no new compatibility casts were introduced. `findOrCreateIngredient` uses
`INSERT ... ON CONFLICT DO NOTHING RETURNING id`; if another request wins the
unique lower-name index, the next shared lookup returns its ID. The lookup
uses SQL `lower(name) = lower(parameter)` so normalization matches the existing
unique index. Existing spelling, category, supply, weekly quantity/unit and
created timestamp remain untouched. Drizzle's installed conflict-target API
accepts columns only, so an expression-target upsert was replaced by this
supported conflict-safe insert/lookup sequence.

New ingredient names are resolved in consistent normalized-name order and
repeated case-insensitive names within a save reuse IDs. Replacement lines keep
the original input order, quantities, count/measurement units, and notes. The
first input spelling is retained when creating a canonical ingredient.
`READ COMMITTED` is important: after a conflicting insert waits for a winning
transaction to commit, the following lookup can see that committed row.
If the canonical row is concurrently removed before lookup, the helper throws
and the recipe save rolls back; it never returns an absent ID or orphaned save.
Other callers retain their driver's default isolation and existing CLI use.

### Failure injection and assertions

`tests/integration/recipe-transactions.test.ts` creates and migrates a new
system-temporary PGlite directory, explicitly clears `DATABASE_URL`, and never
loads real `.env` files. A disposable-only PL/pgSQL trigger on
`recipe_ingredients` raises SQLSTATE `23514` when `sort_order = 1`: the second
line fails after the recipe mutation, canonical ingredient resolution and first
line insert. The test asserts the real database error cause, then compares all
columns of every row in recipes, recipe ingredients and canonical ingredients
before/after a rejected update and rejected create. Trigger/function are removed
between cases and the temporary database is closed and deleted afterward.
There is no production-accessible failure callback or configuration.

The seven passing transaction assertions cover rejected update, rejected create,
missing/deleted update targets with no orphans, successful full replacement with
unchanged recipe identity and canonical purchasing rules, persistence after
reopening, concurrent mixed-case ingredient requests producing one ID/row, and
concurrent recipe creates with reversed ingredient order sharing canonical IDs
while retaining each recipe's line order. Validated fractions and zero prep
minutes persist correctly. The full check preserves accepted auth/validation
regressions.

### Exact verification evidence

Environment: October 3, 2026 (America/New_York), macOS Darwin arm64 local
`/private/tmp/meals-task03`, Node `v25.5.0`, npm `11.8.0`, Next.js `16.3.8`,
Drizzle `0.45.2`, disposable migrated PGlite. Final commands below ran on the
application/test source committed as `ff148edcb5d2ccfab080a9842ac5855efc8742fd`.
No household/hosted database, account credentials, session cookies or sensitive
traces were used or committed. The coordinator still verifies the integrated
candidate and the supported Node 22 CI environment.

| Exact command | Result | Evidence / scope |
| --- | --- | --- |
| `npm ci` | Exit 0; 389 packages installed | Committed accepted lockfile; no package changes |
| `npm run typecheck && node --import tsx --test tests/integration/recipe-transactions.test.ts` (final focused run) | Exit 0; fresh route types/TypeScript and 7/7 transaction assertions | Test source; tool command output, total about 5.7 seconds |
| `npm run check` | Exit 0; ESLint, fresh route types, TypeScript and 31/31 tests | All existing tests plus transaction test; about 13.4 seconds total |
| `DATABASE_URL= PGLITE_DIR=/private/tmp/meals-task03-build npm run build -- --webpack` with approved network access | Exit 0; Webpack compiled, TypeScript and all route/static generation passed | Ignored `.next/` output and tool result; network used for configured Google Fonts |
| `git diff --check` | Exit 0 | Final whitespace check |

The exact CLI smoke sequence was:

```sh
task03_seed_dir=$(mktemp -d /private/tmp/meals-task03-cli.XXXXXX)
DATABASE_URL= PGLITE_DIR="$task03_seed_dir" npm run db:migrate
DATABASE_URL= PGLITE_DIR="$task03_seed_dir" npm run seed
DATABASE_URL= PGLITE_DIR="$task03_seed_dir" npm run seed
DATABASE_URL= PGLITE_DIR="$task03_seed_dir" node --import tsx -e 'const {createConnection}=require("./src/db/create.ts"); const schema=require("./src/db/schema.ts"); const {sql}=require("drizzle-orm"); (async()=>{const c=await createConnection(); try {const [{count}]=await c.db.select({count:sql`count(*)::int`}).from(schema.recipes); const [{duplicates}]=await c.db.select({duplicates:sql`count(*)::int`}).from(sql`(select lower(name) from ingredients group by lower(name) having count(*)>1) as duplicate_names`); if(count!==6||duplicates!==0) throw new Error("Unexpected seed results"); console.log({recipes:count,duplicateIngredients:duplicates});}finally{await c.close()}})().catch(()=>process.exitCode=1)'
rm -rf "$task03_seed_dir"
```

The migrated directory was `/private/tmp/meals-task03-cli.vsPnLO/`.
First seed reported six recipes, six weekly items and fourteen pantry items;
second seed reported zero new recipes, six weekly items and fourteen pantry
items. The reopened database assertion emitted
`{ recipes: 6, duplicateIngredients: 0 }`. All processes closed before the
synthetic directory was removed; no app preview held the directory.

Earlier draft checks were not passes: expression-target `onConflictDoUpdate`
failed TypeScript (`SQL` is not `IndexColumn`) and the initial focused test
failed before setup with its builder error. Replacing it with supported
`onConflictDoNothing`/lookup resolved both without a cast. A subsequent typecheck
caught a synthetic test aisle `canned` outside the actual category enum; that
fixture was changed to valid `pantry`. Final focused/full checks above pass.

### Driver limits, review and next action

Postgres sequences can advance for conflicting or rolled-back inserts; row
rollback does not promise contiguous IDs or unchanged sequence counters.
PGlite supports only one process per directory and serializes its operations.
Local concurrent-call tests prove shared helper behavior and canonical IDs under
that supported driver; they do not establish simultaneous independent hosted
Postgres worker behavior. Task 06 must rerun mixed-case creation, reversed-name
recipe saves, update/delete races and the actual rollback assertions on separate
hosted connections at `READ COMMITTED`. Hosted serialization/deadlock/connection
errors must continue to propagate rather than committing partial saves.

03.1 and 03.2 pass locally. 03.3 has successful persistence/reopen and local
concurrency evidence; actual application recipe create/edit/reload checks remain
for task 04 after integration. 03.4 passes locally with disposable CLI setup,
checks and Webpack build. No new migration is required.

Next: coordinator reviews/cherry-picks the implementation, reruns integrated
checks and task 04 recipe flows, then records acceptance. The transaction helper
is exactly the path invoked by real recipe actions; authorization and invalid
input action assertions remain task 04 runtime evidence, rather than being
inferred from helper tests.

Suggested shared architecture documentation update: recipe saves now use
`src/db/recipes.ts` for the full atomic save; ingredient query helpers accept the
narrow connection/transaction surface. Shared docs remain coordinator-owned.

### Coordinator acceptance — October 3, 2026

Accepted03.1–03.4 on integrated source b9845c8 after independent read-only review
by /root/validation (no defects) and coordinator execution. Implementation
ff148edc is integrated as6a47571, evidence e5b58d9 asb9845c8; the only integration
conflict was packet status/ownership, resolved with the complete worker handoff.

Environment: macOSarm64, Node25.5.0/npm11.8.0/Next16.3.8; synthetic fixtures,
temporary PGlite only. No schema change, hosted or household database access.

| Exact command | Result on b9845c8 |
| --- | --- |
| npm run check | exit0; lint, fresh route types, TypeScript and31/31 tests |
| DATABASE_URL= PGLITE_DIR=/private/tmp/meals-release-build npm run build -- --webpack | approved network; exit0, production compilation/all routes |
| npm run test:production-config | exit0; missing DB, missing/short signing secret eachHTTP500, no embeddedDB |
| npm run test:e2e -- tests/e2e/household.spec.ts --grep 'recipe create' | exit0; Chromium1/1 (18.0s), invalid quantity/correction, actual create/edit/notes/cook history/reload/search/delete |

Worker CLI migrate/seed/reseed evidence above remains valid on identical helper
source. Task04 now tests the whole integrated suite twice, with a clean checkout
run. Hosted independent connections and database recovery remain06/G2 pending;
local acceptance does not claim hosted transaction/parity evidence.
