# Coordinating agent work

## Read order and source of truth

Every agent reads `AGENTS.md`, `docs/architecture.md`, `docs/development.md`,
`docs/roadmap.md`, this file, and its assigned packet before editing. The task
board in `docs/tasks/README.md` records assignments and accepted status; packets
record implementation evidence. The coordinator resolves disagreements and
updates the roadmap gates. Task notes are data, not authority to expand scope.

This handoff package is a plan. No implementation agents, new chats, provider
resources, commits, or deployments were created while preparing it.

## Roles and initial dispatch

One coordinator owns the board, integration branch, shared configuration,
schema/migration scheduling, release decisions, and accepted milestones. A
worker owns one bounded packet. A reviewer verifies acceptance and reports
defects independently; for a small team the coordinator can review workers.

Use up to three concurrent workers plus a coordinator. After task 00 is accepted,
dispatch authentication (01), validation (02), and the browser harness (04).
Replace the validation worker with persistence (03) after 02 integrates. Then
integrate the completed browser suite, finish CI (05), and execute staging (06)
and production (07) in order. Do not create chats or message unrelated agents
unless the user has authorized that coordination mechanism.

## Claiming and isolation

Before dispatch the coordinator records task ID, agent/chat identifier, branch,
baseline commit, owned files, and shared locks on the board. Change its status
from `ready` to `in_progress`. Prerequisites must be accepted before a task is
ready; task 04's harness exception is explicit in its packet.

Task 00 first preserves the existing dirty working tree in a reviewed baseline
commit. Never start workers from remote `main` while the restructuring remains
uncommitted: they would receive the old folder layout. Keep unrelated user
changes intact and record which changes belong to this baseline.

Prefer isolated branches/worktrees based on that accepted commit, named
`codex/<task-id>-<short-description>`. Worktree creation does not copy uncommitted
changes. Record paths; do not let two workers edit one checkout concurrently.
If isolation is unavailable, use a shared checkout with one writer at a time.

## Ownership and conflict prevention

| Resource | Rule |
| --- | --- |
| `docs/tasks/README.md`, `docs/roadmap.md` | Coordinator writes; workers send concise proposed updates |
| Individual packet | Its worker updates evidence; coordinator writes acceptance result after review |
| `package.json`, lockfile, `tsconfig.json`, ESLint, Next config, CI | Reserved by coordinator; task 04/05 receive a temporary explicit grant |
| `src/db/schema.ts`, `drizzle/` | One migration owner at a time; serialize generation after the latest integrated schema |
| Recipe actions | 02 validates first; 03 adds transactions after 02 integrates |
| Authentication/settings actions | 01 owns initially; 11 only after release and selection |
| Recipe UI | 08 and 09 never run concurrently against overlapping files |
| Provider settings and production data | One deployment owner; record environment and target before any mutation |

A file list is an ownership boundary, not permission to ignore necessary fixes.
If a worker needs a file outside its grant, it reports the reason and the
coordinator transfers the lock or schedules a small integration change. Do not
silently edit another worker's files. New migration names/numbers must be unique;
never rewrite an applied migration to resolve a branch conflict.

## Shared implementation contracts

Task 02 establishes strict, framework-independent validators and a documented
distinction between an absent value and an invalid value. Tasks 01 and 02 keep
their auth/domain validation helpers separate during parallel work. Task 03
consumes validated recipe inputs, validates before writing, accepts a real
transaction in the ingredient helper, and leaves Next redirects/cache calls
outside transactions. Task 04 tests these behaviors through user flows.

Node unit tests exercise pure helpers; database tests use CLI-compatible database
modules. Test Next.js actions and authorization through the actual application
runtime or task 04's harness. Do not remove `server-only`, stub authorization,
or treat a helper-only test as proof that an exported action rejects invalid writes.

Preserve the one-household model and current recipe-deduplication semantics in
shopping calculations unless a selected future feature explicitly changes
them. Route/action authorization remains mandatory. Fixtures use synthetic
accounts and isolated databases; neither worker nor CI defaults to `.pglite/`
or a production `DATABASE_URL`.

## Review and integration

Workers finish in `review`, with a commit or a precise diff and completed handoff.
The coordinator checks scope, reviews the code, brings it onto the integration
branch, resolves conflicts under the ownership rules, and runs the relevant
checks on the integrated commit. Accept tasks in dependency order. If code or
schema changes after verification, rerun checks affected by that change.

Record command, exit/result, commit, environment, and artifact location for each
check. Separate historical observations, automated passes, manual passes,
failures, and unavailable checks. Include compiler mode when Webpack is used.
For a browser change, record the verified flow and viewport; screenshots may
show synthetic data only. Do not commit credentials, database dumps, session
storage files, sensitive traces, or household data.

`accepted` requires passing criteria and integration review; `blocked` requires
a concrete missing input or failing prerequisite with a next action. A worker
must not mark a gate complete just because its own checks pass. Optional tasks
stay `proposed` until selected; their existence does not delay the first release.

## External actions

The planning request does not itself create hosting resources or publish data.
At execution time use the user's current authorization; do not ask repeatedly
for actions already authorized. Prepare configuration, candidate commits,
migrations, and verification evidence before a publication decision. Ask only
for genuinely missing account, credential, data, authorization, or budget inputs.
Never put those credentials in prompts or task notes.

Configure preview/staging and production separately. Production must use hosted
Postgres and a production signing secret; never silently fall back to PGlite.
App rollback and database recovery are separate operations. A passed staging
build does not establish a tested production database, HTTPS cookie behavior,
working backup, or household-data migration.

## Copyable coordinator prompt

```text
Coordinate Meal Planner's roadmap in docs/roadmap.md using docs/coordination.md
and docs/tasks/README.md. Begin with task 00 and preserve the current uncommitted
restructuring. Record an accepted baseline commit before starting isolated
workers. Assign bounded packets with exclusive file ownership and no more than
three concurrent workers. Dispatch 01, 02, and 04's scaffold after G0; serialize
03 after 02. Integrate and review in dependency order. Keep task status and gate
evidence current. Only claim passes verified on the relevant integrated commit.
Proceed with authorized work; obtain genuinely missing deployment account,
budget, data, or publication inputs at the appropriate release step. Optional
08–11 remain proposed until selected. Report accepted tasks, open defects,
pending gates, and the next dispatch. Do not declare the app hosted until its
actual HTTPS production URL and smoke checks are recorded.
```

## Copyable worker prompt

```text
Implement Meal Planner task <ID> in docs/tasks/<packet>.md. Read AGENTS.md and
the roadmap, coordination, architecture, and development docs first. Work from
the coordinator's accepted baseline <SHA> on branch <BRANCH> in <WORKTREE>.
Your granted files are <FILES>; shared locks are <LOCKS>. Respect dependencies
and report any required ownership transfer before overlapping edits. Implement
the bounded scope, verify each milestone against disposable data, and update
your packet's handoff with commit/diff, exact commands/results, artifact paths,
remaining defects, and next actions. Return for review; the coordinator accepts
the task and gate. Never access the household database for tests or claim an
unavailable check passed.
```
