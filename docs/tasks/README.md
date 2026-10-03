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
| 01 | [Authentication](01-authentication.md) | accepted | auth / codex/01-authentication | 00 | 4aecd2a; 27 actions × four auth contexts no writes; Settings/CLI revocation and limiter pass |
| 02 | [Validation](02-validation.md) | accepted | validation / codex/02-validation | 00 | 4aecd2a; 37 crafted no-write cases, visible errors/corrections, custom-unit persistence pass |
| 03 | [Transactions](03-transactions.md) | in_progress | auth → persistence / codex/03-transactions | 02 | ff5eae3; /private/tmp/meals-task03 |
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
| Schema and generated migrations | Coordinator (released by 01) | One task at a time, using latest integrated schema |
| Recipe actions and ingredient persistence | /root/auth (03) | Exclusive until03 review/integration |
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

01 and02 grants are released after acceptance; future fixes are assigned explicitly.
03 owns recipe actions, ingredient/recipe persistence, related integration tests and packet03.
04 owns tests/e2e, playwright config, browser fixture scripts and ignore rules. Package/lockfile grant released after bc55ad0; coordinator owns dependency patches.
Coordinator owns board/roadmap/CI and integration. Initial worktrees were based on
868d226;03 starts from accepted integratedff5eae3, never remote main.

October3 /root accepted01/02 on integrated application source4aecd2a after
independent review and actual action/browser evidence (packets01/02/04).
Next: bounded03 dispatch; G1 still requires accepted03/04 and exact-SHA CI.

03 grant: /root/auth now owns src/app/(app)/recipes/actions.ts,
src/db/ingredients.ts, one narrow CLI-compatible recipe persistence helper,
related integration tests and task03 packet in /private/tmp/meals-task03.
Baselineff5eae305d33ddf5549335bfdbadb15b29d5c5e4; no schema/root configuration
grant. Request any necessary ownership expansion before edits. 02 grant released.
