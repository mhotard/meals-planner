# Release evidence

Coordinator: /root. Updated October 2, 2026.
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
