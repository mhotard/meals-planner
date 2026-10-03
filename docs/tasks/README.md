# Release task board

Planning baseline: October 2, 2026. Coordinator: unassigned.
Integration branch / accepted baseline commit: not recorded.
Current release gate: G0 pending. No implementation workers have been dispatched.

Use [the roadmap](../roadmap.md) for milestones and
[coordination](../coordination.md) for assignment and integration rules.
Only the coordinator changes this board; workers update their own packets.

| ID | Packet | Status | Owner / branch | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- |
| 00 | [Baseline](00-baseline.md) | ready | Unassigned | None | Historical checks only; baseline commit needed |
| 01 | [Authentication](01-authentication.md) | queued | Unassigned | 00 | Not run |
| 02 | [Validation](02-validation.md) | queued | Unassigned | 00 | Not run |
| 03 | [Transactions](03-transactions.md) | queued | Unassigned | 02 | Not run |
| 04 | [Browser tests](04-browser-tests.md) | queued | Unassigned | Scaffold: 00; acceptance: 01–03 | Not run |
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
| Package/lockfile and root tool configuration | Coordinator, unassigned | Explicit temporary grant to 04 or 05 |
| Schema and generated migrations | Unassigned | One task at a time, using latest integrated schema |
| Recipe actions | Unassigned | 02 first; 03 after 02 integrates |
| Deployment/provider mutations | Unassigned | 06 then 07; named environment required |

## Pending execution inputs

- Accepted baseline commit and assignment mechanism.
- Hosting/database account owner, project, region, and budget.
- Production starts fresh or migrates existing household data.
- Backup/recovery targets and operator for the hosted release.
- Optional feature priority; email provider if 11 is selected.

These inputs do not block preparing local release fixes. Name the exact dependent
action when an input is needed.

## Integration and gate log

Record task/gate, reviewed commit, result, date, evidence link, reviewer, and next
action. No release gate has been accepted yet.

Use [TEMPLATE.md](TEMPLATE.md) for discovered work. Give it a stable ID,
acceptance criteria, dependencies, and ownership before assignment. Keep
credentials, session storage, real exports, and household data out of task notes.
