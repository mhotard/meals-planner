# 05 — Integrate CI and accept a release candidate

Status: queued. Owner: unassigned (coordinator/integrator).
Dependencies: accepted 01–04. Branch/worktree and candidate commit: unassigned.

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

Results: not run. Return candidate commit, CI/PR links, check enforcement,
migration order, nonblocking defects, and deployment handoff. No hosting is
claimed here. G1 acceptance: pending.

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
