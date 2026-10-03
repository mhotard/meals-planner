# 04 — Automate household browser regressions

Status: in_progress. Owner: `/root/browser` (browser QA).
Dependencies: scaffold after accepted 00; final acceptance after accepted 01–03.
Branch/worktree: `codex/04-browser-tests`, `/private/tmp/meals-task04`.
Baseline commit: `868d22614355dac71ee3a72dd63cda51cdfd1e30` (accepted G0).

## Goal and ownership

Make manual flows repeatable with isolated data. Own new `tests/e2e/`, fixtures,
and `playwright.config.ts`. Obtain a temporary grant for package/lockfile, ignore
rules, and test scripts/configuration. Request locator/accessibility changes
from feature owners; CI belongs to 05.

## Plan

1. Read installed Next.js `01-app/02-guides/testing/playwright.md`. Add Playwright
   to this app; do not scaffold a replacement project.
2. Add proposed command `npm run test:e2e`. Fixtures create a temporary database,
   clear inherited `DATABASE_URL`, migrate, create synthetic users/recipes,
   start the server, run tests, stop the server, and clean up even on failure.
3. Use one PGlite process per directory. Serialize tests sharing a server or give
   each worker its own server/database. Disable unsafe existing-server reuse and
   refuse production targets for destructive fixture setup/teardown.
4. Test login/logout, protected routes and action authorization, recipe CRUD,
   notes/cook logs, recipe/custom plan entries, and shopping computation/state.
   Cover compatible mixed units, weekly minima, pantry restore, checked/skip/
   extras persistence, and text/Trello exports.
5. Use a separate signed-out share context; assert disabled mutation controls,
   failed unauthorized writes, and invalid-token behavior.
6. Check desktop and narrow-phone layouts, keyboard/form access, and print styles.
   Prefer role/label locators and behavioral assertions over fixed sleeps or
   implementation snapshots. Save failure traces/screenshots using synthetic data.
7. A development-server suite can run first. Add production-mode tests where
   secure cookies work; never disable cookie security to get a pass. Mandatory
   HTTPS production-mode evidence is completed in 06. Explain local coverage limits.
8. Test the integrated 01–03 fixes before requesting final acceptance.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 04.1 | Harness works from clean checkout with no household data/server reuse | Proposed `npm run test:e2e`; isolation and cleanup assertions |
| 04.2 | Main flows and unauthorized writes have behavioral checks | Named specs, state/DB assertions, signed-out context |
| 04.3 | Desktop/mobile and print/export checks pass | Browser results and screenshots/traces; document print-preview limits |
| 04.4 | Integrated fixes pass without timing flakiness | Full suite twice for initial stability; `npm run check` and build |

## Handoff and acceptance

Coordinator acceptance: pending. Scaffold/spec work in progress; final
verification must run on the integrated 01–03 candidate.

- Dependency commit: `bc55ad0f08778e3c24567261c8b9cc0b49ce9a11`.
  Package/lockfile grant released back to coordinator; coordinator owns the
  subsequent Next/security update. No application/schema edits in this packet.
- Environment: macOS arm64, Node `v25.5.0` (Node 22 CI still assigned to 05), PGlite in per-test OS temporary directories,
  synthetic random credentials, Chromium headless 153.0.8010.12/Playwright v1243,
  development Webpack loopback HTTP. No household database was opened.
- `npm ci`: passed, 386 baseline dependencies installed.
- `npm install -D @playwright/test`: initial sandbox DNS ENOTFOUND; escalated
  retry passed. `npx playwright install chromium`: escalated download passed.
- `npx playwright test tests/e2e/household.spec.ts --grep 'recipe create'`:
  first sandbox launch failed (macOS MachPort permission); escalated retry passed
  1 test (22.2s), recipe CRUD, notes, cook-log history, search and deletion.
- `npm run check`: passed, lint/fresh route types/TypeScript and 11 baseline tests.
  A preceding lint run failed because the Playwright callback named `use` was
  mistaken for React's hook; renamed the callback and reran successfully.
- Initial desktop flow failed on expected decimal rendering (product renders
  `2½ lb`/`½`); corrected preserved output expectations. A concurrent command
  was refused by Next's build directory lock, with cleanup completed. Serialized
  corrected desktop run passed 1 test (20.9s), including shopping computation,
  persistence, public share, exports, and print CSS.
- Signed-out direct-action transport debug found public-route forwarding can
  stop at proxy before dispatch; helper now posts compiled feature routes.
  Signed-out proxy protection passed (1 test, 33.3s); independent action auth
  evidence uses a signed nonexistent-user fixture token and requires integrated
  task 01. Guard suite plus Settings/revocation results pending integration.

Suite inventory, isolation contract, commands, compiler settings, artifact
policy, and coverage limits: `tests/e2e/README.md`. Only failure PNG screenshots
in ignored `test-results/` may be uploaded; traces/session state are disabled.
HTTPS production cookies and OS print preview remain unverified (task 06).

### Integrated 01/02 targeted evidence

Application sources tested after merging coordinator candidate `d3eef85` into
browser branch at `cefc3b8`. Next `16.3.8`, Playwright `1.63.0`, desktop
1280×900, development Webpack, loopback HTTP, per-test temporary PGlite. Source
fixes for custom unit inherited properties still awaited at this point.

- `npm ci`: passed (389 packages added, 390 audited). No package files changed.
- `npx playwright test tests/e2e/action-guards.spec.ts tests/e2e/authentication.spec.ts --grep-invert 'custom count units'`:
  first integrated run 4 passed/3 failed. Signed-out, invalid, expired, and
  correctly signed nonexistent-user requests passed no-write checks for all
  27 mutation exports. Failures were in the harness, not application defects:
  an incomplete copied Flight wire format supplied empty FormData; an assertion
  matched page error-boundary `error: "$undefined"` metadata; logout navigation
  began before logout completed; dev HMR after snapshot restart interrupted login.
- Replaced copied argument encoding with installed React `encodeReply` (this
  Next patch uses `_1_name` FormData prefixes), parsed only the Flight root
  action promise, waited for logout, and disconnected pages before restart.
  Snapshot cleanup handles `signalCode` and restores environment in nested
  finally blocks. Temporary isolation spec was removed after diagnosis.
- `npx playwright test tests/e2e/action-guards.spec.ts --grep 'crafted invalid'`:
  corrected run passed 1 test (25.0s); concrete validation errors and unchanged
  domain/account digests for crafted arrays, quantities, integer metadata,
  source links, dates, rating, enum/day/ID values, patches and cross-plan IDs.
  Includes an actual Flight `undefined` update ID with otherwise valid recipe data.
- `npx playwright test tests/e2e/authentication.spec.ts tests/e2e/household.spec.ts --grep 'Settings|protected routes|throttling|recipe create|forms display'`:
  4 passed/1 failed (2.0m). Passed routes/redirect/login/logout (21.6s), real
  Settings invalid inputs/no-write, two-session password revocation/new login
  (34.7s), durable limiter after restart/generic missing-account error (25.4s),
  and recipe invalid-quantity error/preservation/correction/CRUD (14.6s).
  Weekly form quantity retention/correction and plan error passed; the final
  assertion expected a native date input to display an impossible date. Native
  date sanitization correctly clears that value; this was an invalid test expectation.
- `npx playwright test tests/e2e/household.spec.ts --grep 'weekly item retains'`:
  corrected test passed (13.7s), including pantry preservation and valid fraction,
  impossible-date server feedback with browser constraint bypass, and valid
  date correction creating the containing Monday plan.
- `npm run check`: passed on integrated sources, lint/fresh route types/TypeScript
  plus 23 unit/integration tests (10.99s test runner). Later test-only CLI
  reset addition requires another final check before acceptance.

- `npx playwright test tests/e2e/authentication.spec.ts --grep 'actual account CLI'`:
  passed 1 test (20.0s). Harness stopped Next, ran the actual
  `node --import tsx scripts/seed-user.ts` with generated synthetic arguments and
  explicit disposable environment, restarted Next, rejected both old sessions,
  and permitted the replacement password. Credentials were never printed.

- Latest source merge: `975423bd1fc4ade6f6b609ab269414d07c4f1336` includes
  coordinator source `7e8fd7553ae7103700ffd017dc18a6029adced55` and custom-unit fix.
  Transport/cleanup/auth/form regression commit:
  `6ef8d8952a93ab640b33b90b26f1227c04315f2c`; final positive-result assertion fix:
  `03443836cadf5b20150be43811f54fd34ecdc965`.
- `npx playwright test tests/e2e/action-guards.spec.ts --grep 'custom count units|exported action requests'`:
  corrected native encoder auth batch passed all four contexts, with 27 actual
  mutation requests in each: signed-out (30.5s), invalid token (23.7s), expired
  token (26.1s), and correctly signed nonexistent-user token (27.4s). Unchanged
  household/account digests proved no writes. The initial custom-count assertion
  still checked whole response metadata; changed the last such check to actual
  root action result and audited the suite with `rg` (none remain).
- `npx playwright test tests/e2e/action-guards.spec.ts --grep 'custom count units'`:
  passed 1 test (15.4s) on `03443836`, actual recipe creation with `constructor`
  unit, actual plan action, correct `2 constructor` shopping line without
  NaN/undefined, and checked-state persistence after reload.
- Crafted invalid-action batch contains 37 cases, verified from the spec's AST.
  All targeted local browser checks needed by tasks 01/02 now pass; coordinator
  acceptance remains separate. No application defect was attributed to the
  prior wire-format or response-metadata harness failures.

Pending: full suite twice and check/build on integrated task 03, then coordinator
review. Browser environment remains Node v25.5.0/macOS arm64; Node 22/Linux CI
evidence belongs to 05. Production HTTPS and OS print preview remain task 06.

### Coverage review while waiting for 03

- Added bounded checks for Uncheck all/persistence, pantry have-it returning the
  item to pantry prompts/persistence, authorized extra removal/persistence, and
  an actual valid mutation attempted from the context viewing a public share.
  The share attempt must redirect to login, remain absent on reload, and leave
  the domain/account snapshot digest unchanged. Private refs are recompiled
  after snapshot server restart; the signed-out context stays separate.
- `npx playwright test tests/e2e/household.spec.ts --grep '1280px'`: passed 1 test
  (27.1s), updated controls and denied share-context behavior. The database digest
  assertion was added afterward and is included in the phone run below.
- `npx playwright test tests/e2e/household.spec.ts --grep '390px'`: passed 1 test
  (32.9s), all added controls plus share-context database no-write digest.
- Fresh-checkout `npm ci` and at least one full browser run still pending on the
  final integrated candidate; no earlier targeted run substitutes for 04.1/04.4.

### Harness review before final candidate

- Bounded each readiness fetch to two seconds inside the existing 90-second
  deadline. Replaced every generated password `fill` with native input setter
  and input/change events; value retention asserts a boolean, so failure output
  cannot reveal the expected credential. Generated passwords, signing/action
  keys and tokens are masked before use only when `GITHUB_ACTIONS=true`.
- Actual-action transport failures now report a fresh generic action-name error,
  omitting request headers, cookies, bodies and the original diagnostic cause.
  CLI arguments/logs remain ephemeral and are removed with the test directory.
- `npx playwright test tests/e2e/authentication.spec.ts`: passed 4/4 (1.7m) on
  `02168bb` application sources plus these harness changes: redirects/login/logout
  22.3s, Settings invalid-input/no-write and two-session revocation 32.9s,
  durable throttling 26.2s, actual CLI reset/new login 19.1s. Same macOS/Node25,
  Chromium desktop, disposable PGlite and Webpack environment as above.
- `rg` audit found no generated-password fill/type or credential-valued
  `toHaveValue` assertions remaining. Full suite still awaits integrated 03.
