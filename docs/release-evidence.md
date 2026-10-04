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

Integrated tasks 01–04 are accepted. Remote candidate
`6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e` passed all release CI steps on October 3.
G1 accepted for this exact SHA after coordinator and independent readiness review;
acceptance is recorded in task 05 and the task board.

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
403 Resource not accessible by personal access token. GitHub branch protection
is not configured or verified by this work. The enforced coordinator process is:
do not merge, deploy, or accept a changed candidate without a successful required
job matching its exact SHA. Review failures before retrying; never substitute a
worker's result or an older green commit. An isolated negative rehearsal now
proves that the workflow reports a failed check and skips dependent steps.

### Remote verification — October 3, 2026

Positive run: [37161614515](https://github.com/mhotard/meals-planner/actions/runs/37161614515),
SHA `6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e`, conclusion `success`.
Environment: GitHub Actions Ubuntu 24.04.5 x64, Node 22.23.3, npm 10.9.9,
Next 16.3.8. Workflow commands and results:

| Command | Result |
| --- | --- |
| `npm ci` | Exit 0, committed dependencies installed |
| `npm run check` | Exit 0; lint, fresh route types, TypeScript, 31/31 unit/integration tests |
| `npm run build` | Exit 0; default Turbopack, compilation 6.4s, 10/10 static pages |
| `npm run test:production-config` | Exit 0; absent DB, absent/short signing secret each rejected with HTTP500; no local DB opened |
| `npm audit --omit=dev` | Exit 0; zero production vulnerabilities |
| `npx playwright install --with-deps chromium` | Exit 0 |
| `npm run test:e2e` | Exit 0; 14/14 Chromium tests, 9.4 minutes, no retries; development Webpack with disposable DBs |

Negative run: [37161642511](https://github.com/mhotard/meals-planner/actions/runs/37161642511),
SHA `542c0e632f2fdd7a2e703c3ea809c2fe44b59cc6`, branch
`codex/ci-negative-rehearsal`, conclusion `failure`. Its sole extra file is
`tests/unit/ci-negative.test.ts`; `npm run check` exited 1 with
`INTENTIONAL_RELEASE_GATE_FAILURE`, 31 passed / 1 intentionally failed.
Build, configuration smoke, audit and browser steps were skipped. This test was
never integrated into the release branch. The rehearsal branch remains evidence;
it must never be merged or deployed.

Evidence inspected with `gh run view 37161614515 --repo mhotard/meals-planner
--json status,conclusion,headSha,jobs` and the same command for `37161642511`
(exit 0), plus `gh run view <ID> --repo mhotard/meals-planner --log` and
`--log-failed` for the negative run (exit 0). Only nonsecret results are recorded.

The release branch was pushed successfully with
`git push -u origin codex/release-baseline`. `gh pr create --repo
mhotard/meals-planner --base main --head codex/release-baseline --draft
--title 'Harden Meal Planner release and add isolated regression CI'
--body-file /private/tmp/meals-release-pr-body.md` failed with GraphQL
`Resource not accessible by personal access token`; a REST POST to the same
repository's pulls API also returned HTTP403. The browser's PR form redirected
to GitHub sign-in. No PR has been created or attached. The reviewed branch and
exact SHA are available for staging; PR creation awaits secure sign-in or
suitable repository access. No merge or publication occurred.

Migration inventory at the candidate: ordered `0000_init`, then
`0001_natural_matthew_murdock`; both SQL files and snapshots are committed.
Original 0000 remains byte-for-byte unchanged from baseline, blob
`fd01246bf4c298797d81846477fa478f5ceee0cf`. Task 03 added no migration.
No unresolved local application blocker was found in integrated reviews.
The nine development-only advisories below remain known nonblocking findings;
hosted concurrency, HTTPS cookies and recovery are mandatory G2 evidence.

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
default-compiler evidence, not a pass. Default compiler remained enabled on the
normal CI runner; the later successful run is recorded above. Network-enabled
npm run build -- --webpack passed on Next16.3.8. At this preparation milestone,
CI/G1 were still pending integration.

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
Default Turbopack was unavailable locally as recorded
above; the CI default build had not run at this local-review milestone.

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
At task03 acceptance, task04 stability/freshcheckout and task05 exact-SHA CI
were pending; their later results are recorded separately.

Task04 accepted: freshcheckout e6249da reproduces npmci,31checks, Webpackbuild
and full14/14 Chromium suite twice (5.5m/5.4m), no retries, clean source and
zero leftoverfixtureDBs. Source/test/config remains identical on integration
branch; documentation updates do not replace the exact testedSHA evidence.
At task04 acceptance, task05 remote Node22/default-compiler and negative CI
were pending; successful verification and G1 acceptance are recorded above.
