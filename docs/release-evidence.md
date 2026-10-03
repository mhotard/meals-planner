# Release evidence

Coordinator: /root. Updated October 3, 2026.
Integration branch: codex/release-baseline.
Preserved baseline: 868d22614355dac71ee3a72dd63cda51cdfd1e30.

## Baseline / G0

Accepted. Fresh checkout, installation, checks, Webpack build, disposable setup
and login are recorded in [task 00](tasks/00-baseline.md). Local environment:
macOS, Node 25.5.0, npm 11.8.0, Next 16.3.0. Node 22 CI remains a separate check.
Initial sandbox DNS/port failures were resolved by authorized network retries.

## Candidate / G1

Pending integrated tasks 01–04 and real CI results. Default compiler is configured
in CI; local baseline verification used Webpack. Neither compiler mode nor a
worker pass is evidence of remote CI success.

Workflow uses read-only repository permission, no persisted checkout credentials,
Node 22, synthetic signing secret, no production database or provider secrets,
and serialized disposable browser fixtures. Action tags were resolved with
git ls-remote against the official action repositories on October 2, 2026:
[checkout](https://github.com/actions/checkout),
[setup-node](https://github.com/actions/setup-node),
[upload-artifact](https://github.com/actions/upload-artifact).
Pinned SHAs are in the workflow. Only synthetic PNG failure screenshots are retained for three days;
credentials/session traces and private fixture logs are never uploaded.

GitHub network-enabled repository read succeeded. Branch protection API returned
403 Resource not accessible by personal access token. Required-check enforcement
is unverified. Until provider permissions allow enforcement, coordinator must
refuse release acceptance unless a successful check run matches the exact SHA.
A negative CI run on an isolated branch is still required.

## Staging / G2 and production / G3

Pending. No HTTPS deployment, hosted database, backup, restore, rollback, or
operator acceptance has been verified. Account/project owner, region, budget,
initial household data choice, recovery targets and operator have been requested.
Do not interpret a proposed runbook as operational evidence. Optional 08–11
remain proposed.

## Dependency review (candidate preparation)

Updated next, @next/env and eslint-config-next together from 16.3.0 to 16.3.8;
sharp now resolves 0.35.5. npm audit --omit=dev returned exit 0 / zero
production advisories after the patch. Compatible npm audit fix refreshed
transitives without force. Full audit still reports nine development-only
advisories: braces/micromatch/fast-glob in ESLint (hostile glob recursion) and
esbuild in Drizzle's deprecated loader (development-server cross-origin reads).
These tools do not serve production requests; CI evaluates trusted committed
configuration, and Drizzle Studio/esbuild development servers are not used.
No forced downgrade to Next14/Drizzle0.18 was applied. Review again at candidate
acceptance; do not claim the full audit is clean.
[Next advisory](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j),
[sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).

Patched default npm run build: sandbox Google Fonts failure, then network-enabled
retry failed Turbopack process/port permission (EPERM). This is unavailable local
default-compiler evidence, not a pass. Default compiler remains enabled on the
normal CI runner for verification. Network-enabled npm run build -- --webpack
passed on Next16.3.8. CI/G1 remain pending integration.

After compatible transitive fixes, npm run check completed exit0 (13/13 tests,
lint/fresh typegen/TypeScript) in the coordinator checkout. October3 resume:
all three workers retained their isolated drafts after usage-limit interruption;
no work discarded and no accepted status advanced.

Production config smoke (local preparation): missing database, absent/short signing secret returnHTTP500; no embeddedDB created. Initial process-exit assumption failed and was corrected; see task06. HTTPS/hosted evidence pending.

## Integrated local review — October 3

Candidate source through `7e8fd7553ae7103700ffd017dc18a6029adced55` includes
authentication, validation, reviewed missing-update-ID and custom-unit fixes,
browser scaffolding and production configuration preflight. Coordinator checks
in the macOS checkout (Node25.5.0/npm11.8.0/Next16.3.8): `npm run check` exit0,
24/24 unit/integration tests with lint, fresh route types and TypeScript;
the network-enabled Webpack build and production-config smoke passed as recorded
in task06. The build source was unchanged by the final documentation commit.
Default Turbopack remains unavailable locally as recorded
above; the CI default build has not run.

`npm run test:e2e -- tests/e2e/household.spec.ts` on `7e8fd75` exited0,
3/3 Chromium development Webpack tests (~1.1minutes): recipe CRUD/notes/cook logs,
desktop1280 and phone390 plans/shopping persistence, signed-out shares,
clipboard exports and print CSS. Every test created and removed a disposable
PGlite directory and synthetic account. No production HTTPS or OS print-preview
claim follows from this local coverage. Additional worker action/authentication
and visible-invalid-input evidence is under review before 01/02 acceptance.

Task03 accepted on integrated b9845c8:31/31check, network-enabled
DATABASE_URL= PGLITE_DIR=/private/tmp/meals-release-build npm run build -- --webpack
exit0, npm run test:production-config exit0, and actual recipe flow1/1passed.
Independent persistence review clean; exact evidence/driver limits in task03.
Task04 final stability/freshcheckout and task05exact-SHA CI remain pending.

Task04 accepted: freshcheckout e6249da reproduces npmci,31checks, Webpackbuild
and full14/14 Chromium suite twice (5.5m/5.4m), no retries, clean source and
zero leftoverfixtureDBs. Source/test/config remains identical on integration
branch; documentation updates do not replace the exact testedSHA evidence.
Task05 nowinprogress; remote Node22/defaultcompiler andnegativeCI pending.
