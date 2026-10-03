# 07 — Release production and hand off operations

Status: queued. Owner: unassigned (deployment + independent QA).
Dependencies: accepted 06/G2. Candidate SHA / release operator: unassigned.

## Goal and ownership

Deliver a verified HTTPS household app with a named operator and recovery
instructions. Own release record, production configuration, operations handoff,
and smoke verification. App changes go back to owners and through affected gates.

## Plan

1. Review G2 candidate, current publication authorization, account/budget/data
   decisions, restore drill, and blockers. Prepare the concrete release before
   asking for genuinely missing publication inputs.
2. Prepare hosted production data/secrets using 06's runbook. Start fresh unless
   the user chooses migration. For migration: back up the source, rehearse a
   compatible logical export/import from PGlite, preserve IDs/relationships,
   fix sequences, and verify counts. Do not assume `pg_dump` connects directly
   to an embedded PGlite directory. Leave the original household data intact.
3. Back up any existing production data before migration. Apply reviewed migrations
   with one operator, then publish the approved candidate. Do not seed household
   production with demo data by default.
4. Run bounded HTTPS production smoke using synthetic records or an agreed
   household workflow: login, recipe save/edit, Monday plan, shopping overrides,
   reload, signed-out share, logout/private-route protection. Verify secure
   cookies and persistence across a fresh session. Do not delete real data.
5. Verify scheduled backups/retention, logs, service limits, and operator error
   notifications. Test failure notification in staging. Record recovery targets
   and secret-access locations without documenting secret values.
6. Record URL, provider IDs, deployed SHA, migration state, smoke/backup evidence,
   operator, and rollback instructions. Update README with the verified live URL.
   Coordinator accepts G3 only after this evidence and operator handoff.
7. Provide a usage guide; capture feedback after a week of actual household use.
   Do not create a scheduled reminder unless requested. Select optional packets
   from observed needs; their existence does not delay the initial release.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 07.1 | Production has intended initial data/schema | Fresh-start decision or migration rehearsal/count/relationship report |
| 07.2 | HTTPS production runs accepted release and main flows | URL/deployment ID/SHA and bounded smoke, including signed-out share/protection |
| 07.3 | Operations/recovery are usable by a named person | Active backup evidence, G2 restore drill, logs/notification test, operator acceptance |
| 07.4 | Hosted/completion claim has supporting evidence | README URL and release record; coordinator accepts G3 |
| 07.5 | Improvements follow real use | Feedback and selected follow-ups; no unsupported claim that optional work is complete |

## Handoff and acceptance

Results: not run. Return URL/SHA, nonsecret configuration inventory, data/migration
report, smoke results, operator/runbooks, known limits, and feedback plan.
G3 acceptance: pending.

Preparation October3: docs/user-guide.md describes current tested household
flows and account/share behavior; README links the draft deployment/operations
runbooks and explicitly states no verified production URL. This is preparation,
not production release or operator acceptance. Actual data choice, HTTPS URL,
deployed SHA, smoke, backup/restore/rollback and named handoff remain pending.
