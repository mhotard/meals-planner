# Staging verification checklist

Prepared procedure only: no hosted connection, deployment, test, backup or restore
has been executed. Coordinator reviewed this procedure on October 3, 2026;
this is not an executable suite and does not satisfy G2.

Frozen candidate: `6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e`.
Recorded release CI passed 31 checks, default Turbopack production compilation,
configuration smoke, production audit and 14 development browser tests. These
support G1, not hosted/HTTPS/recovery evidence. Use alongside
[deployment](deployment.md), [operations](operations.md) and [task 06](tasks/06-staging.md).

## S00 — Establish scope and independently verify targets

Reuse the current session's authorization; do not seek a new generic approval
for routine work already authorized. Establish genuinely missing account/project,
region, budget, operator, publication scope, production-data choice and recovery
inputs before the dependent external actions. Those inputs are currently missing.

- Independently inspect the provider console: record owner, purpose, project/
  branch/database IDs, hostname/port, database name and region. A variable named
  “staging” or an operator flag alone does not prove the target is disposable.
- Use separate approved targets for destructive driver probes, HTTPS staging,
  and restoration. The restore target starts empty and differs from the source.
  Compare with the nonsecret production inventory; any production match stops
  this procedure. Do not obtain or print a production URL for the comparison.
- Load only approved target secrets privately. Disable shell tracing; no secrets,
  dumps, HARs, cookies, request bodies or session files in Git/reports/screenshots.
- Before connecting/writing, parse the selected URL: require nonempty hosted
  `postgres:`/`postgresql:`, approved host/port/database, approved TLS settings,
  and no local/household/production match. Verify identity with a read-only
  `SELECT current_database(), current_user, current_setting('server_version');`.
  Check client/provider TLS privately; a pooled server IP is not target identity.
- Hosted probes use `NODE_ENV=production` and an explicit URL; the existing driver
  fails closed on a missing production URL. Never allow embedded fallback.
  Set bounded statement/lock and overall probe timeouts on each connection.

**Stop:** missing dependent inputs, mismatched identity, unclear TLS/scope/cleanup
rights, or a production/local target. Resolve the specific issue without deleting
household data. Once scope is established, verify it rather than asking again.

## S01 — Frozen checkout, migrations and synthetic accounts

Use a clean verification checkout of the frozen SHA, Node 22 and committed lockfile:

```sh
git rev-parse HEAD
git status --short
node --version
npm --version
npm ci
```

Record versions and SHA. A changed candidate needs exact-SHA CI again. Provider
build command is the verified `npm run build`; do not silently switch compilers.
One named operator applies migrations, never at app build/boot.

After S00, privately load the disposable driver URL. Existing commands, in a
private Bash terminal with no credential-bearing diagnostic output shared:

```sh
set +x
set -euo pipefail
: "${MEALS_DRIVER_DATABASE_URL:?Approved disposable hosted URL required}"
NODE_ENV=production DATABASE_URL="$MEALS_DRIVER_DATABASE_URL" npm run db:migrate
NODE_ENV=production DATABASE_URL="$MEALS_DRIVER_DATABASE_URL" npm run db:migrate
```

- Expect `0000_init`, then `0001_natural_matthew_murdock`; task 03 added no migration.
  Read `drizzle.__drizzle_migrations` privately; record migration hashes/timestamps
  against the candidate's installed migration reader/SQL, not Git blob hashes.
- Second migration run adds no journal row and changes no application rows.
  Inspect lower-name uniqueness, foreign keys, session-version and limiter columns.
- Repeat separately on approved empty staging using its own explicit URL. Demo
  seed is allowed only for approved synthetic staging, never production. In the
  same private terminal, require a separately loaded `MEALS_STAGING_DATABASE_URL`
  and run `NODE_ENV=production DATABASE_URL="$MEALS_STAGING_DATABASE_URL" npm run seed`.
- Bootstrap synthetic accounts with the existing `npm run user -- <email> <name>
  <password>` CLI in a private unrecorded environment, or a reviewed private
  adapter using `upsertLogin` and shared input/password validation. The CLI uses
  password arguments: avoid shared runners/process visibility and command logs.
  Document only the sanitized invocation, account purpose/ID and result.

**Stop:** migration drift/errors, unexpected target/data, or unavailable secure
account setup. No schema push, rewritten migration or unreviewed down migration.

## S02 — Hosted recipe transactions and canonical ingredients

**No dedicated hosted runner exists yet.** Local integration tests forcibly clear
`DATABASE_URL` and create PGlite. They cannot provide hosted parity even when a
hosted URL is supplied. Do not weaken those safe fixtures or invent `test:postgres`.

An operator-reviewed scoped adapter must use actual `createConnection`,
`findOrCreateIngredient` and `saveValidatedRecipe`, with separate connection
objects, guaranteed closure and bounded timeouts. Use accepted assertions in
`tests/integration/recipe-transactions.test.ts`; record adapter path/hash and exact
command. Assert `validateRecipeInput(FormData).ok`; pass its successful `.value`
to `saveValidatedRecipe`, not the result wrapper. SQL-only recipe simulations are
not application-helper evidence.

Operator assertions on the disposable driver target:

1. Save/reopen a two-line recipe: all metadata/quantities/units/notes/order persist,
   including `1 1/2`, `1/3`, blank optional fields and zero prep minutes. Update it;
   ID stays stable, lines fully replace, existing purchasing rules stay unchanged.
2. Run simultaneous mixed-case ingredient requests on independently opened hosted
   connections; assert one SQL-lower-name row/ID. Run simultaneous recipe saves
   with shared ingredients in opposite orders; assert complete lines, shared
   canonical IDs and each recipe's input order. Confirm independent backend
   sessions where supported; one client's serialized queue is insufficient.
3. Missing/deleted update targets return the controlled missing-recipe result
   without writes. Coordinate an update/delete race on separate connections:
   complete committed update followed by legitimate deletion, or no-write missing
   target; final foreign keys remain valid.
4. Install the accepted test's disposable-only PL/pgSQL failure trigger from
   `tests/integration/recipe-transactions.test.ts:43`. It raises SQLSTATE `23514`
   on the second recipe line (`sort_order = 1`). This is not a migration or public
   failure flag. Capture full-row snapshots of recipes, ingredients and lines in
   protected memory. Test both failed create and failed update through the real
   helper: assert that database error, equal before/after row sets including
   timestamps/purchasing rules, old update lines intact, and no new ingredients.
   Sequence gaps are permitted; row rollback is the criterion. Remove trigger/
   function in guaranteed cleanup; quarantine the target if cleanup fails.

`saveValidatedRecipe` explicitly uses `READ COMMITTED`; verify real driver support.
Unexpected deadlock/serialization/connection errors fail the probe; do not hide
with retries. **Stop/pending:** no reviewed adapter, target/DDL rights missing,
failed assertions or incomplete cleanup. Do not claim hosted evidence.

## S03 — Login limits on simultaneous independent connections

Use real `upsertLogin`, `authenticatePassword`, `findSessionUser` and
`replacePassword` from `src/db/auth.ts`, through the reviewed hosted adapter.
Credentials/claims remain in memory; normalize email and respect password limits.

1. Create one synthetic account; correct password succeeds. Choose one fixed `now`.
2. Launch 12 bad-password attempts together on 12 distinct connection objects to
   the same disposable target. All reject; exactly one limiter row holds exactly
   `LOGIN_FAILURE_LIMIT` (10), not lost increments or 12. A correct password still
   rejects inside the 15-minute window, including on a new connection after restart.
3. Call the helper at `now + LOGIN_WINDOW_MS`: correct password succeeds and
   failures reset. This existing helper parameter is not a public clock override.
4. Missing account rejects. Version-guarded password replacement increments once,
   invalidates old claims, rejects stale-version replacement, and accepts only
   the new password. Delete only the synthetic test account; its old claims reject.
5. Unrelated recipe/plan/shopping rows remain unchanged. Verify identical public
   missing/wrong/locked error text separately on HTTPS.

**Stop/pending:** no independent-connection adapter, lost increments, unexpected
success, hung client or incomplete cleanup. Local PGlite concurrency is separate.

## S04 — Production HTTPS browser flows and actual action authorization

Deploy the exact frozen SHA to approved staging with staging-only database and a
separate production-strength signing secret. Record deployment/SHA, HTTPS URL,
Node/build mode and nonsecret variable scopes. Require HTTPS certificate validity
and successful responses; a ready banner/listening port is insufficient.

**No remote production browser runner exists yet.** The local Playwright fixture
starts a dev server, creates/removes PGlite and uses a dev-only action manifest.
It is unsuitable for remote targets. Use private operator browser checks or a
separate reviewed HTTPS runner; never redirect its teardown at staging/production.
Record browser/version and desktop 1280×900 / phone 390×844 observations:

| ID | Manual check and required result |
| --- | --- |
| S04.1 | Signed-out private routes redirect; safe relative `next` works, external/encoded unsafe destinations remain on the app. HTTPS `meals_session` is Secure, HttpOnly, SameSite=Lax, path `/`, with bounded lifetime. Inspect attributes without recording value. |
| S04.2 | Recipe search/create/edit/reload, notes/cook logs; fractions persist. Invalid quantity/date/rating/URL/arrays/enums show errors, retain fields and leave rows unchanged; correction saves. |
| S04.3 | Monday week, recipe/custom keyboard meals, notes and reload; duplicate planned recipes retain entries while deduplicating ingredient demand. Day indexes stay 0–6. |
| S04.4 | 2 lb + 8 oz combines to 2.5 lb; distinct count units stay separate; weekly amounts are minima; pantry prompts remain separate until restored. Checked/skipped/restored state and extras persist after reload. Cross-week crafted IDs/keys cannot change either week. |
| S04.5 | Text/Trello copy, phone interaction, print CSS. Distinguish CSS verification from actual OS print preview. |
| S04.6 | Two contexts: Settings password change and secure actual CLI/helper reset revoke prior sessions; fresh login/new password works. Delete a synthetic user with a retained valid signed cookie; pages and actions reject that cookie. |
| S04.7 | Signed-out/malformed/expired/revoked/deleted-user contexts cannot mutate; signed-in valid session works; logout protects private routes/actions. Wrong/missing/locked login error text matches. |
| S04.8 | Signed-out share is read-only for its intended week; invalid token rejects; private settings/write authority absent. Keep share tokens out of reports/screenshots. |

For actual action coverage, inventory exports from `tests/e2e/action-guards.spec.ts`
(including Settings). A reviewed private production transport must capture fresh
legitimate references for this deployment, retain cookies/request fields only in
memory, replay each private action with tested session states, and compare full
before/after rows privately. A page/proxy redirect alone does not prove action
`requireUser`; valid deleted-user/revoked-version cookies exercise the database
check beyond signature verification. Refresh references after redeployment.
Unknown stale action IDs, malformed transport or unrelated page errors are not
passes. The dev `callAction` helper is not a production transport.

**Stop/pending:** safe production replay unavailable, skipped critical case,
unexplained write or cookie/security failure. Expected login-limiter writes must
be asserted separately; account/password/version changes must not be ignored.
No exported HAR, traces, session files, cookie screenshots or shared request logs.

## S05 — Persistence across redeploy

Create a synthetic fixture spanning account, canonical rules, recipe/lines/cook
log, Monday plan/entries/notes, extras and checked/excluded overrides. Record IDs
and full-row digests privately. Redeploy the **same candidate** against the same
staging database/secret; record new deployment ID/SHA and HTTPS readiness.
Verify fixture rows, shopping state, signed-out share and fresh-session login.
Do not migrate/seed to conceal lost data. Any loss, unexpected identity/session
change or unknown SHA fails; source/production remain untouched.

## S06 — Separate restore, comparisons and measured recovery

Confirm recovery targets/provider capability before paid settings. Proposed daily,
seven-day and one-hour values are not approvals. Verify completed backup and
retention readback, not only a schedule; seven historical daily points do not
exist on day one. Keep backups in approved protected storage, outside Git/CI.

1. Record backup ID/time, source target/SHA and migration journal. Pause staging
   writes or use a consistent backup point for source comparisons; later writes
   must not be mistaken for failed restoration. Leave source intact.
2. Restore into the separately approved empty restore target. Start recovery time
   before the request; include configuration/redeployment and restored HTTPS smoke,
   stopping only after the app works. Record actual elapsed time against target.
3. Compare counts for users, ingredients, recipes, recipe_ingredients, cook_logs,
   meal_plans, meal_plan_entries, plan_extra_items, plan_item_states, login_attempts;
   migration hashes/timestamps, session metadata and representative synthetic rows.
   Compare all foreign keys, nullability, case-insensitive uniqueness, IDs/sequences,
   units/order/rules and selected shopping overrides. Unused stable item keys can
   remain intentionally; do not call them broken foreign keys. Sequence gaps are
   permitted; safe synthetic inserts must prove no sequence collision.
4. Deploy a separate restored HTTPS app with restore DB and its own signing secret.
   Fresh login from restored accounts, recipe/plan/shopping and signed-out share
   must work. Old cookies need not survive a signing-secret change. Report only
   counts/assertions/digests, not user hashes, tokens or row/dump contents.

**Stop:** drift, unsupported comparison/recovery method, wrong target or incomplete
smoke. Preserve recovery copy; do not overwrite the source to force a pass.

## S07 — Application rollback compatibility

Choose a previously verified staging deployment/SHA and document schema/session
compatibility with the candidate's migration set. The old preserved baseline is
not automatically a safe rollback version. If no compatible version is known,
rollback is pending. Use only the selected provider's approved staging procedure:
switch app deployment, verify actual ID/SHA/HTTPS, fresh login, save/read,
plan/shopping and signed-out share; re-promote candidate and repeat. Compare rows
aside from intended synthetic writes. A retained build/control click is not proof.

No down migrations, source rewind or household traffic switch. Application
rollback does not recover data; uncertain compatibility stops this step and
requires a separately verified S06 restoration path.

## Evidence record (one row per subcase)

| Field | Record without secret values |
| --- | --- |
| Test / milestone | S00–S07 subcase; 06.1–06.5 mapping |
| Who / when | Operator/reviewer; UTC start/end, recovery elapsed time |
| SHA / environment | Exact candidate/deployed/rollback SHAs and deployment IDs; approved purpose/project/branch/database IDs, region, hostname/database name, runtime/browser/compiler/driver versions |
| Invocation | Exact sanitized existing command or reviewed private adapter path/hash; actual SQL/assertions and manual browser steps |
| Result / evidence | Exit/HTTP status; expected/actual counts/digests; pass/fail/pending; attempt number; CI/deployment/backup IDs and redacted evidence location |
| Cleanup / blocker | Connections closed, failure objects removed, authorized target disposition; specific missing input/runner/failing case and next owner/action |

S00/S01/S04 support 06.1; S01–S03/S05 support 06.2; S04 supports 06.3;
S06 supports 06.4; S07 supports 06.5. All actual hosted/HTTPS/recovery checks remain
pending. G3 additionally needs verified production URL/SHA, bounded production
smoke, active operations and named operator handoff. This checklist supplies no
executed evidence and no prepared executable hosted suite.
