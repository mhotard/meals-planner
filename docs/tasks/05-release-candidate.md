# 05 — Integrate CI and accept a release candidate

Status: accepted. Owner: /root (coordinator/integrator).
Dependencies: accepted01–04. Branch: codex/release-baseline; coordinator checkout.
Local verified source/test/config: e6249da0c6bcecfb1edaf7efae4809f9abf0710f.
Remote candidate: 6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e.
Positive and intentional-negative CI results verified; G1 accepted October 3, 2026.

## Goal and ownership

Produce one reviewed commit with reproducible CI checks. Own integration,
`.github/workflows/`, root configuration grants, release evidence, and docs.
Feature fixes return to their owners.

## Plan

1. Review/integrate 01/02, then 03, then 04's complete suite. Resolve schema and
   root configuration serially; verify coherent migration history. Test the
   merged commit rather than relying on worker-branch results.
2. Add CI on Node 22 for `npm ci`, `npm run check`, production compilation, and
   the accepted browser suite. Verify action versions/permissions from official
   sources at implementation time.
3. Use synthetic secrets and disposable test databases; never provide production
   credentials to PR jobs. Install browser dependencies and configure deliberate
   evidence retention without household data or credential/session leakage.
4. Test the default compiler in a normal runner. If Webpack is required, record
   why and use that verified mode for deployment. Label development-only E2E
   coverage; task 06's real HTTPS production behavior remains required.
5. Prove an intentionally failing check fails CI on an isolated branch. Configure
   required checks/merge protection where access allows, or document an enforced
   equivalent integration process.
6. Review unresolved defects and dependency/security findings. Fix blockers or
   create bounded packets; do not hide failed checks or treat every minor advisory
   as automatically blocking.
7. Push through the user's authorized repository workflow and attach any created
   PR. Record candidate SHA, CI/PR URLs, build mode, and migration inventory.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 05.1 | Required jobs pass on one integrated commit | CI URL/SHA; check, build mode, E2E results |
| 05.2 | Failing checks cannot be presented as a successful candidate | Negative CI run and required-check/process evidence |
| 05.3 | No unresolved release blockers; migration order is coherent | Reviewed defect log and migration inventory |
| 05.4 | Staging receives a concrete verified candidate | SHA/PR, configuration names, results; coordinator accepts G1 |

## Handoff and acceptance

Results: all required CI steps passed on the candidate; negative rehearsal failed
on its intended assertion. Reviewable branch is published. Draft PR creation is
blocked by GitHub access (API403; browser signed out). No hosting is claimed.
G1 accepted for the exact remote candidate SHA above. Independent readiness
review found no application blocker and confirmed that the packet permits an
enforced coordinator process when GitHub branch protection is unavailable.

## Coordinator preparation — October 3, 2026

Workflow drafted with official action SHAs, Node22, read-only repository scope,
synthetic signing secret and no production database credentials. Default compiler
scheduled on Ubuntu CI; local Turbopack hit an environment process/port EPERM.
Webpack production compilation on Next16.3.8 passed with network access.
Dependency patch: Next/@next/env/eslint-config-next16.3.8 and sharp0.35.5.
Production audit exit0 / zero advisories. Non-forced compatible development
transitive fixes applied; remaining nine development-only advisories are assessed
in docs/release-evidence.md. npm run check after changes: exit0, 13/13 tests.
No candidate accepted yet: worker integration, complete browser coverage,
positive and negative CI runs remain required.

October3 migration inventory reviewed on `7e80572`: journal version7/PostgreSQL,
ordered idx0 `0000_init` then idx1 `0001_natural_matthew_murdock`; both SQL files
and snapshots exist. `git diff 868d226 -- drizzle/0000_init.sql drizzle/meta/0000_snapshot.json`
exit0/empty. `git hash-object drizzle/0000_init.sql` and
`git rev-parse 868d226:drizzle/0000_init.sql` both returned
`fd01246bf4c298797d81846477fa478f5ceee0cf`, preserving the original migration.
0001 adds only durable login attempts and users.session_version default0.
Local fresh/re-run migration coverage passes in the auth integration test;
hosted migration/driver evidence awaits06. Task03 currently has no schema grant.
Recheck inventory if03 requests a migration. Candidate05.3/G1 remain pending.

October3 pre-CI review:03 accepted without schema changes. Independent read-only
workflow/config review found no static blocker, but identified unbounded browser
readiness and possible generated-password failure diagnostics. Both are fixed
in integratede6249da: timed readiness fetch, private native password input,
CI secret masking and generic action-request transport failures. Workflow masks
its signing secret before setting GITHUB_ENV. Full stability pair is running
on frozene6249da in a clean detached checkout; remote05 execution still awaits04.

Dependency refresh on24465f5 (same lockfile as frozen candidate):
`npm audit --json` captured by Python subprocess returned audit exit1, nine
development-only advisories (five high/four moderate, no critical). This is not
a clean full audit. Proposed forced fixes downgrade major Next/Drizzle tool
versions; they were not applied. Existing development-only exposure assessment
in docs/release-evidence.md remains unchanged. `npm audit --omit=dev` exited0,
zero production vulnerabilities. No dependency files changed during this review.

## Integrated remote verification — October 3, 2026

Candidate `6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e` on
`codex/release-baseline` passed
[CI37161614515](https://github.com/mhotard/meals-planner/actions/runs/37161614515).
GitHub Actions Ubuntu24.04.5 x64, Node22.23.3/npm10.9.9/Next16.3.8:
`npm ci`, `npm run check` (31/31), `npm run build` (default Turbopack, 6.4s
compilation), `npm run test:production-config`, `npm audit --omit=dev` (zero),
`npx playwright install --with-deps chromium`, and `npm run test:e2e`
(14/14,9.4m,zero retries) all exited0. No production secrets or DB supplied.
Browser tests exercise development Webpack; HTTPS production flows remain06.
This resolves the CI default-compiler requirement, without rewriting the earlier
unavailable local Turbopack result.

Negative-only branch `codex/ci-negative-rehearsal` at
`542c0e632f2fdd7a2e703c3ea809c2fe44b59cc6` ran
[CI37161642511](https://github.com/mhotard/meals-planner/actions/runs/37161642511).
`npm run check` exited1:31pass/1fail, exact error
`INTENTIONAL_RELEASE_GATE_FAILURE`. Later dependent checks were skipped.
The extra assertion file is not present in the candidate and must never be merged.

Exact inspection commands, job results, environments and URLs are in
[release-evidence.md](../release-evidence.md). Both run-view and log retrieval
commands exited0. Both branch pushes exited0. GitHub branch protection access
returned403; server enforcement was not installed. Coordinator process enforces
an exact-SHA successful required job before merge/deploy, and reruns the gate
when source/config/tests change. Failure cannot be substituted with an older pass.

05.1 and05.2: passed by the positive/negative runs and enforced process.
05.3: passed by integrated reviews and coherent migrations, with nine documented
development-only advisories accepted as nonblocking (full audit not clean).
05.4: concrete candidate SHA, build mode and configuration inventory prepared in
[deployment.md](../deployment.md); passed after coordinator and independent
readiness review. PR creation remains an access follow-up, not a claimed pass.

Draft PR title/body are prepared at `/private/tmp/meals-release-pr-body.md`.
GraphQL `gh pr create` and REST pulls POST both denied access; browser fallback
requires sign-in. User input requested securely; never place a token in chat.
No PR URL is invented. A created PR must be attached to this chat when available.

Acceptance: /root accepted05/G1 on October3 for exact
`6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e`, after integrated source reviews,
positive and intentional-negative CI evidence, migration review and independent
readiness review by /root/validation. Deployment must use this frozen SHA.
Later documentation commits do not replace its exact-SHA test evidence.
Any changed deployment candidate needs its own successful required job.
Next:06; provisioning blocked on missing provider/account/budget/region inputs.
Local fixtures cannot be pointed at staging; use the separate operator procedure
and record actual hosted/HTTPS results before acceptingG2.
