# Meal Planner roadmap

Planning baseline: October 2, 2026. This roadmap defines future execution;
creating these documents does not implement the tasks or publish the app.

## Outcome and current state

Deliver a reliable hosted meal planner for one household, then improve it using
household feedback. Preserve the current recipes, weekly plans, purchasing
rules, cook logs, and read-only sharing.

The agent-friendly source organization and development documentation are in
place. The previous implementation session passed 11 tests, lint, TypeScript,
a Webpack production build, and manual login/plan/shopping/share checks against
a disposable database. These are historical results, not acceptance evidence
for later changes. Turbopack could not start a worker in that environment.

The source changes are still local and uncommitted. Hosting is unconfirmed:
the inspected GitHub repository had no homepage or deployment records. No live
URL, production database, backup policy, or deployment account has been verified.

## Release milestones

| Gate | Deliverable | Evidence required to pass | Initial status |
| --- | --- | --- | --- |
| G0 | Reproducible, committed baseline | Fresh checkout installs, checks/builds; baseline commit and ownership recorded | Accepted: 868d226; fresh checkout verification in task 00 |
| G1 | Reliable release candidate | Tasks 01–04 accepted; CI green on one integrated commit; no unresolved release-blocking defects | Pending |
| G2 | Working hosted staging app | HTTPS staging URL and commit recorded; hosted Postgres tested; isolated environments; backup restored successfully; rollback rehearsed | Pending |
| G3 | Household production release | Production URL/commit recorded; release flow and data decision verified; monitoring/backups active; named operator accepts handoff | Pending |
| G4 | Feedback-driven improvements | Selected optional packets accepted with their own checks; household feedback recorded | Proposed |

G0 is owned by task 00, G1 by task 05, G2 by task 06 (including its operations
rehearsal), and G3 by task 07. The coordinator accepts every gate; a worker's
completion report alone does not advance a gate.

## Work packets and order

| ID | Work packet | Dependencies | Agent role | Verification milestone |
| --- | --- | --- | --- | --- |
| 00 | [Preserve the baseline](tasks/00-baseline.md) | None | Coordinator/integrator | Fresh checkout reproduces checks and build |
| 01 | [Authentication hardening](tasks/01-authentication.md) | 00 | Authentication | Redirect, session, authorization, and throttling regressions pass |
| 02 | [Validate mutation inputs](tasks/02-validation.md) | 00 | Domain validation | Invalid inputs produce no writes; valid fractions and dates remain supported |
| 03 | [Atomic recipe saves](tasks/03-transactions.md) | 02 | Persistence | Injected failure rolls back every recipe write; concurrent ingredient creation behaves predictably |
| 04 | [Browser regression suite](tasks/04-browser-tests.md) | Scaffold after 00; final acceptance after 01–03 | Browser QA | Main household flows pass with isolated data in desktop/mobile layouts |
| 05 | [CI and release candidate](tasks/05-release-candidate.md) | 01–04 | Coordinator/integrator | Required CI jobs pass on the candidate commit |
| 06 | [Staging and operations rehearsal](tasks/06-staging.md) | 05 | Deployment/operations | Hosted-driver smoke, restore drill, and rollback rehearsal pass |
| 07 | [Production and operator handoff](tasks/07-production.md) | 06/G2 | Deployment + independent QA | Real HTTPS release verified and recovery instructions accepted |
| 08 | [Recipe import](tasks/08-recipe-import.md) | 07/G3; selected by household | Recipes | Previewed import creates exactly one validated recipe |
| 09 | [Serving-size scaling](tasks/09-serving-scaling.md) | 07/G3; selected by household | Recipes | Scaling preview is correct and leaves stored recipes unchanged |
| 10 | [Copy a previous week](tasks/10-copy-week.md) | 07/G3; selected by household | Plans | Copy is atomic, gets a new token, and does not copy shopping/cook state |
| 11 | [Account recovery](tasks/11-account-recovery.md) | 07/G3; selected by household | Authentication | Recovery tokens expire, are single-use, and do not reveal account existence |

Tasks 01 and 02 may run concurrently. Task 04 can build its harness concurrently
with them, but must test the integrated fixes before acceptance. Task 03 waits
for task 02 because both touch recipe actions. Tasks 08 and 09 are serialized
because both touch recipe UI; task 10 can run alongside either, and task 11 can
run separately subject to the shared schema/migration lock.

## Scope and decisions

The initial release supports one shared household. Multi-household accounts,
public signup, AI-generated menus, nutrition tracking, and a mobile native app
are outside this release. No new feature is required to pass G3.

The provisional deployment route follows the existing README: Vercel plus a
hosted Postgres provider, with Neon as the candidate. Task 06 must verify
current compatibility, account access, plans, and cost before provisioning.
No free-tier pricing or backup retention is assumed. Equivalent providers can
be substituted with a recorded decision and the same verification gates.

Before task 06's external steps, establish the account/project owner, permitted
budget, region, and initial production-data approach (start fresh or migrate
existing household data). A provider subdomain is sufficient for the first
release; a custom domain is optional. Workers can prepare deployment artifacts
while those inputs are pending.

Task 07 proposes a daily recoverable backup, at least seven retained daily
recovery points, and a one-hour restore target for this household app. Confirm
these targets against the selected provider and budget, then prove them in the
staging rehearsal. They are proposed requirements, not existing capabilities.

## Start and handoff

Use [coordination.md](coordination.md) for assignments, ownership locks, prompts,
integration order, and completion rules. The live task board is
[tasks/README.md](tasks/README.md). Begin with task 00; dispatch no dependent
implementation until the baseline is reproducible.

Each packet includes implementation steps, acceptance checks, dependencies,
and a handoff section. Required checks must pass on the same candidate commit.
An unavailable check leaves its release gate pending; it is not a pass.

Execution update October 2, 2026: restructuring preserved in baseline 868d226. G0 accepted; 01/02/04 scaffold assigned with exclusive ownership. Remaining gate evidence pending.
