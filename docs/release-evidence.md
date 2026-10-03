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
Pinned SHAs are in the workflow. Failure evidence upload awaits the browser
harness's safe artifact contract; credentials/session traces must not be uploaded.

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
