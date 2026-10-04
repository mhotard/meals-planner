# Operations and recovery (prepared; not yet rehearsed)

Status: draft. Operator, hosted resources, recovery policy and evidence pending.
Proposed targets: daily backups, at least seven retained daily recovery points,
restore within one hour. Confirm budget/provider capability before adopting them.
The [staging verification procedure](staging-verification.md) defines the
separate-target restore, measured recovery time, and application rollback checks.

## Backup and restore rehearsal

Record the selected provider plan's actual retention and restore capabilities.
Neon restore history is plan-dependent:
[restore documentation](https://neon.com/docs/manage/backup-restore).
If provider history cannot meet the agreed daily retention, arrange encrypted
logical backups in approved storage with access and expiry controls. Backups
contain credentials and household data; never place them in Git or CI artifacts.

Restore staging into a different empty database, leaving the source intact.
Record start/end times, backup identifier, source/restored migration journal,
and counts for users, ingredients, recipes, recipe ingredients, cook logs,
meal plans, entries, extras, item states and limiter/session metadata. Verify
representative foreign-key relationships, case-insensitive ingredient names,
IDs/sequences, and fresh-login/private-page/shopping/share behavior through a
restored HTTPS app. Compare elapsed recovery time to the agreed target.
A dump's existence does not prove a recoverable backup.

### Proposed Neon schedule (unconfigured)

Official [backup/restore instructions](https://github.com/neondatabase/website/blob/main/content/docs/guides/backup-restore.md)
(checked October3) support daily scheduled snapshots on paid plans and restores
into a new branch. Free has one manual snapshot and no automated schedule.
Snapshot storage is listed at $0.09/GB-month; first scheduled snapshot is full,
subsequent snapshots are incremental. Confirm actual account capabilities/cost.

After budget and operator agreement, configure a daily23:00UTC schedule on the
named production root branch, with eight days retention (691200seconds) to leave
margin around the seven retained daily-point target. This is proposed timing;
record the actual agreed setting, branch/project IDs and schedule readback.
Verify a newly completed backup and available snapshot IDs, not only schedule
creation. Do not imply seven historical daily points exist on day one.
Rehearse a multi-step restore into a new staging branch/database, compare data
and migration state, and verify the restored HTTPS app before any traffic switch.
No restore should replace the source during this rehearsal.

## Application rollback

Keep the previous known-good deployment ID and SHA. Rehearse switching staging
to that application version against a schema known compatible with both versions.
Record which migrations are additive and which constrain rollback compatibility.
Do not run destructive down migrations by default. Application rollback does
not recover deleted or corrupted data.
[Vercel rollback](https://vercel.com/docs/deployments/rollback-production-deployment).

## Daily operator responsibilities

Before handoff, record a named operator and secure access locations (no values).
Verify backups/retention and a recovery drill, service usage/cost limits, runtime
logs and error notifications. Test notification delivery in staging. Monitor
failed logins, failed saves and database availability without logging passwords,
tokens, request bodies or connection strings. Provider billing alerts need a
verified destination and threshold.

For an incident: identify environment and deployed SHA, stop unsafe writes if
needed, preserve logs, choose compatible app rollback or separate DB restoration,
verify login/data/relationships on a replacement, then switch traffic. Record
actions and measured recovery time. Never overwrite the only recovery copy.

## Release handoff record

Still required: operator acceptance; HTTPS production URL and deployed SHA;
database/project identifiers; migration inventory; bounded production smoke;
active backup policy and backup IDs; successful isolated restore/rollback
records; notification test; budget/limits; secure account access instructions.
Optional improvements remain unselected until household feedback.
