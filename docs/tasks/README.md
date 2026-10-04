# Release task board

Planning baseline: October 2, 2026. Coordinator: /root.
Integration branch: codex/release-baseline; accepted baseline: 868d22614355dac71ee3a72dd63cda51cdfd1e30.
Current release gate: G0 and G1 accepted; G2 pending missing hosting inputs.
Frozen release candidate: 6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e.

Use [the roadmap](../roadmap.md) for milestones and
[coordination](../coordination.md) for assignment and integration rules.
Only the coordinator changes this board; workers update their own packets.

| ID | Packet | Status | Owner / branch | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- |
| 00 | [Baseline](00-baseline.md) | accepted | Coordinator / codex/release-baseline | None | 868d226; fresh install, 11/11 checks, Webpack build, disposable setup/login |
| 01 | [Authentication](01-authentication.md) | accepted | auth / codex/01-authentication | 00 | 4aecd2a; 27 actions × four auth contexts no writes; Settings/CLI revocation and limiter pass |
| 02 | [Validation](02-validation.md) | accepted | validation / codex/02-validation | 00 | 4aecd2a; 37 crafted no-write cases, visible errors/corrections, custom-unit persistence pass |
| 03 | [Transactions](03-transactions.md) | accepted | auth → persistence / codex/03-transactions | 02 | b9845c8;31checks, real rollback/CLI/build and actual recipe flow pass |
| 04 | [Browser tests](04-browser-tests.md) | accepted | browser / codex/04-browser-tests | Scaffold: 00; acceptance: 01–03 | e6249da cleancheckout;31checks/build;14/14 twice; isolated cleanup |
| 05 | [Release candidate / CI](05-release-candidate.md) | accepted | Coordinator / codex/release-baseline | 01–04 | 6eec71f; CI37161614515 passed31/defaultbuild/config/audit/14browser; negative37161642511 failed intended assertion |
| 06 | [Staging / recovery rehearsal](06-staging.md) | blocked | Coordinator / codex/release-baseline | 05/G1 | Local runbooks/config prepared; provider account/project, budget/region/operator/data/recovery inputs missing; no hosted passes |
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
| Recipe actions and ingredient persistence | Coordinator (03 released) | Future fixes assigned explicitly |
| Deployment/provider mutations | Coordinator (not granted to workers) | 06 then 07; named environment and missing inputs required |

## Pending execution inputs

- G1 accepted candidate established; exact-SHA deployment rule applies.
- Draft PR access: token denied PR creation; browser requires secure sign-in.
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
03 grant released after acceptance; coordinator assigns any follow-up source fix.
04 grant released after acceptance; coordinator owns root/CI configuration and
assigns any test follow-up. Package/lockfile grant previously released afterbc55ad0.
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

October3 /root accepted03 on b9845c8 after independent review,31checks,
Webpack production build, fail-closed smoke and actual recipe create/edit/reload.
Next:04fullsuite twice on samecandidate pluscleancheckout; then05remoteCI.

October3 /root accepted04 after freshcheckout e6249da reproducibility and14/14
browser tests twice with no retries. Task05 claimed bycoordinator; nextauthorized
actions: publishreleasebranch/draftPR and isolatednegativeCI branch. G1 remains
pending exact-SHA positiveCI, intentionalfailure evidence andcandidate review.

October3 /root accepted05/G1 for6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e.
PositiveCI37161614515 success and negativeCI37161642511 intended failure verified;
independent readiness review clean. GitHub branch protection is unconfigured:
coordinator requires exact-SHA green CI before merge/deploy. Draft PR blocked by
token permissions and browser sign-in; branch is published, no PR invented.
06 claimed by coordinator and blocked only for dependent external actions.
Next: obtain hosting inputs, provision isolated staging, execute hosted/HTTPS
checks, restore and rollback rehearsal.07/G3 queued;08–11 remain proposed.
Documentation-only grant released: /root/validation prepared
docs/staging-verification.md; coordinator reviewed it. No source/config/schema/
provider access was granted. Hosted and production-action runners remain pending.
