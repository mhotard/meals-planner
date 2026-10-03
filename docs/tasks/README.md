# Release task board

Planning baseline: October 2, 2026. Coordinator: /root.
Integration branch: codex/release-baseline; accepted baseline: 868d22614355dac71ee3a72dd63cda51cdfd1e30.
Current release gate: G0 accepted; G1 pending. Worker dispatch authorized after G0.

Use [the roadmap](../roadmap.md) for milestones and
[coordination](../coordination.md) for assignment and integration rules.
Only the coordinator changes this board; workers update their own packets.

| ID | Packet | Status | Owner / branch | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- |
| 00 | [Baseline](00-baseline.md) | accepted | Coordinator / codex/release-baseline | None | 868d226; fresh install, 11/11 checks, Webpack build, disposable setup/login |
| 01 | [Authentication](01-authentication.md) | in_progress | auth / codex/01-authentication | 00 | Baseline 868d226; /private/tmp/meals-task01 |
| 02 | [Validation](02-validation.md) | in_progress | validation / codex/02-validation | 00 | Baseline 868d226; /private/tmp/meals-task02 |
| 03 | [Transactions](03-transactions.md) | queued | Unassigned | 02 | Not run |
| 04 | [Browser tests](04-browser-tests.md) | in_progress | browser / codex/04-browser-tests | Scaffold: 00; acceptance: 01–03 | Baseline 868d226; /private/tmp/meals-task04 |
| 05 | [Release candidate / CI](05-release-candidate.md) | queued | Unassigned | 01–04 | Not run |
| 06 | [Staging / recovery rehearsal](06-staging.md) | queued | Unassigned | 05/G1 | Not run |
| 07 | [Production](07-production.md) | queued | Unassigned | 06/G2 | Not run |
| 08 | [Recipe import](08-recipe-import.md) | proposed | Unassigned | 07/G3 and selection | Not run |
| 09 | [Serving scaling](09-serving-scaling.md) | proposed | Unassigned | 07/G3 and selection | Not run |
| 10 | [Copy week](10-copy-week.md) | proposed | Unassigned | 07/G3 and selection | Not run |
| 11 | [Account recovery](11-account-recovery.md) | proposed | Unassigned | 07/G3 and selection | Not run |

Status transitions: `proposed` (optional/unselected), `queued` (dependencies
pending), `ready`, `in_progress`, `review`, `accepted`. Use `blocked` with a
specific reason and next action. Update both board and packet on acceptance.
Historical passes are not acceptance of a new implementation.

## Shared locks

| Resource | Owner | Grant / release condition |
| --- | --- | --- |
| Package/lockfile and root tool configuration | Coordinator /root | Explicit temporary grant to 04 or 05 |
| Schema and generated migrations | auth (01) | One task at a time, using latest integrated schema |
| Recipe actions | validation (02) | 02 first; 03 after 02 integrates |
| Deployment/provider mutations | Unassigned | 06 then 07; named environment required |

## Pending execution inputs

- Baseline and assignments established; see G0 and active grants.
- Hosting/database account owner, project, region, and budget.
- Production starts fresh or migrates existing household data.
- Backup/recovery targets and operator for the hosted release.
- Optional feature priority; email provider if 11 is selected.

These inputs do not block preparing local release fixes. Name the exact dependent
action when an input is needed.

## Integration and gate log

Record task/gate, reviewed commit, result, date, evidence link, reviewer, and next
action. G0 accepted October 2, 2026 by /root on 868d22614355dac71ee3a72dd63cda51cdfd1e30. Evidence: task 00. Next: 01/02/04 scaffold.

Use [TEMPLATE.md](TEMPLATE.md) for discovered work. Give it a stable ID,
acceptance criteria, dependencies, and ownership before assignment. Keep
credentials, session storage, real exports, and household data out of task notes.

## Active ownership grants

01 owns auth/login/settings, auth helpers/tests, seed-user, schema and drizzle.
02 owns form/domain validation, recipe/pantry/plan actions and related UI/tests; no schema/root changes.
04 owns tests/e2e, playwright config, browser fixture scripts and ignore rules. Package/lockfile grant released after bc55ad0; coordinator owns dependency patches.
Coordinator owns board/roadmap/CI and integration. Worktrees are based on 868d226, never remote main.
