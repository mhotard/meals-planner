# 06 — Deploy staging and rehearse operations

Status: blocked (dependent external actions). Owner: /root (deployment/operations).
Dependencies: accepted05/G1. Branch: codex/release-baseline; coordinator checkout.
Frozen candidate: 6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e.

## Goal and ownership

Prove the candidate works on HTTPS and hosted Postgres with tested recovery.
Own deployment configuration, proposed `docs/deployment.md`/`docs/operations.md`,
deployment scripts, and hosted-driver fixtures. Coordinate any database driver,
root configuration, or schema edits with their owners.

## Plan

1. Resolve account/project, region, budget, publication authorization, and fresh
   start vs household-data migration. Check current provider plans and installed
   Next.js support. Vercel/Neon is provisional, not an existing configured service.
2. Separate staging and production databases/secrets; previews cannot use the
   production database. Hosted deployments must fail on absent `DATABASE_URL`
   or production `AUTH_SECRET`, rather than silently selecting local PGlite.
3. Provision isolated hosted staging and explicitly apply migrations once with
   one operator; do not migrate at app boot/build. Create synthetic accounts
   securely; demo seed only staging. Deploy the candidate SHA and record HTTPS URL.
4. Verify the actual Postgres driver: fresh/re-run migrations, case-insensitive
   uniqueness, transaction success/rollback, concurrent login throttling, and
   persistence across redeploy. If adding proposed `npm run test:postgres`, require
   an explicitly disposable hosted test database and prohibit production targets.
5. Run 04's flows on HTTPS with production cookie/session settings. Use a separate
   staging configuration; never apply local destructive teardown to production.
6. Implement the agreed backup policy from the roadmap. Restore staging into a
   different empty database; compare table counts and representative ingredient,
   recipe, plan, entry, override, and user relationships. Verify migration state
   and login on the restored app; measure recovery time against the target.
7. Rehearse application rollback separately from database recovery. Test schema
   compatibility; do not assume app rollback undoes migrations or run destructive
   down-migrations by default.
8. Deliver deployment/operations runbooks: environment names, secure secret access,
   migration order, rollback, restore, logs, limits, cost, and production-data plan.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 06.1 | HTTPS staging serves approved SHA with isolated data/secrets | URL/deployment ID/SHA; nonsecret scope inventory; missing-config failure check |
| 06.2 | Hosted-driver behavior matches accepted local invariants | Postgres transaction/uniqueness tests, redeploy persistence, migration results |
| 06.3 | Production cookie/auth and household flows work on HTTPS | Browser report with revocation and signed-out sharing; no skipped critical flows |
| 06.4 | Backup restores into a separate DB within agreed target | Count/relationship comparisons, restored-app smoke, measured recovery duration |
| 06.5 | Rollback has a known compatible schema path | Rehearsal and compatibility record; coordinator accepts G2 |

## Provider references

Environment changes require a new deployment and scope verification.
[Vercel environment variables](https://vercel.com/docs/environment-variables).

Use the current documented application rollback procedure and independently
establish database recovery.
[Vercel production rollback](https://vercel.com/docs/deployments/rollback-production-deployment).

Neon's restore history depends on the selected plan. Check actual retention;
do not infer the proposed backup target from free-tier availability.
[Neon restore documentation](https://github.com/neondatabase/website/blob/main/content/docs/postgres/backup-restore/branch-restore.md).

## Handoff and acceptance

Results: not run. Return staging URL/SHA, resource identifiers, runbooks,
budget/data decisions, driver/browser results, restore/rollback evidence, and
blockers. Never include connection strings, passwords, or dumps. G2: pending.

## Preparation record — October 2, 2026

Coordinator prepared docs/deployment.md and docs/operations.md, explicitly
unverified until execution. src/db/create.ts now rejects missing/blank
DATABASE_URL in production via a pure runtime-config guard. npm run check:
exit 0, 13/13 tests including production fail-closed cases (macOS Node25.5.0).
Candidate SHA/build evidence will be recorded after integration.
No hosted resources, migration, HTTPS smoke, backup or restore performed.
External steps await G1 plus account/project, region, budget, data and operator inputs.

October3 preparation: src/instrumentation.ts adds Node production startup preflight
for hosted DATABASE_URL and the auth signing secret. It skips compilation phase,
opens no connection and performs no migrations. Missing-config process failure
must be verified on the integrated candidate before marking 06.1 passed.

Production-preflight preparation verified October3 on integrated app source:
network-enabled npm run build -- --webpack exit0 (Next16.3.8).
Initial smoke incorrectly expected the process to exit1; it timed out and was
terminated, so that test failed. Diagnostics showed Next keeps its listener but
returns HTTP500 after instrumentation rejects preparation. Corrected repeatable
npm run test:production-config exit0: missing DATABASE_URL, missing AUTH_SECRET
and short AUTH_SECRET all returned HTTP500 with the expected preflight error,
and no local database directory was created. All cases used synthetic config
and a nonresolving fake URL; no hosted or household database was opened.
This local preparation does not satisfy hosted06.1/G2.

October3 provider research: current official Neon plans (updatedOctober1) show
Free six-hour restore history; paid Launch permits seven days and scheduled
snapshots. Proposed environments and priced units are in docs/deployment.md;
draft daily snapshot/isolated multi-step restore procedure in docs/operations.md.
No account choice, monthly budget, operator, data decision, resource creation,
paid upgrade, hosted driver check or HTTPS staging pass is claimed.

October3 G1 handoff: exactcandidate6eec71f passed Ubuntu24.04.5/Node22.23.3
defaultTurbopack CI37161614515,31checks/configsmoke/prodaudit/14browser.
Independent readiness review confirmed local fixtures intentionally select
PGlite/development and cannot establish hosted or HTTPS production evidence.
Separate operator procedure is being prepared in docs/staging-verification.md.

Blocked actions and genuinely missing inputs:

- Provision staging: provider account/project owner, region, monthly cap and secure account access.
- Configure paid backup/recovery rehearsal: approved provider plan, recovery targets and operator.
- Prepare production data: fresh household versus explicit migration decision.
- Publish production afterG2: intended account/project/publication scope and named operator.

These are missing execution inputs, not new approval requirements for local work.
They were requested; no answer has been inferred from elapsed time. No hosted
resources, credential changes, migrations or billing commitments were made.
06.1–06.5 remain not run; G2 pending. Next action is isolated staging provisioning
once the required inputs and secure account access are established.
