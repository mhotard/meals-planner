# Hosted release runbook (prepared; deployment pending)

Status: draft. No provider resources or HTTPS URLs have been verified.
Use [release evidence](release-evidence.md) for actual gate results.
Use [staging verification](staging-verification.md) for the operator checklist;
its unexecuted steps and missing hosted runners are explicit.

## Inputs and environment isolation

Before provisioning, record account/project owner, provider plans and region,
monthly spending limit, publication scope, operator and initial-data decision.
Use a provider subdomain initially unless a domain is selected. Current account
access, Next 16.3 compatibility, pricing and retention must be checked at execution.
Vercel/Neon remain candidates, not configured accounts.

### Provider proposal checked October 3, 2026

Vercel Hobby covers personal, noncommercial projects; a family-only planner
appears to fit that use, subject to the owner's account choice. Its usage can
pause the app when limits are exceeded, so verify account limits and alerts.
[Hobby plan](https://vercel.com/docs/plans/hobby).
[Next.js hosting support](https://vercel.com/docs/frameworks/full-stack/nextjs)
documents App Router/server rendering support, but actual candidate deployment
and production-cookie tests remain required.

Neon Free currently includes100 CU-hours/project, 1GB/project storage and six
hours of restore history. Launch is usage-priced with no monthly minimum:
$0.106/CU-hour, $0.35/GB-month database storage, $0.20/GB-month restore history;
up to seven days of history and paid-plan scheduled snapshots are available.
[Current official plan source](https://github.com/neondatabase/website/blob/main/content/docs/introduction/plans.md)
(updated October1). This is a proposal, not a budget approval or bill estimate.

Prefer separate Vercel projects and separate Neon projects for staging/production.
Proposal: Free staging for driver/HTTPS checks; production Launch with daily
scheduled snapshots if the owner permits paid usage. If the restore rehearsal
uses scheduled snapshots, staging also needs an approved paid plan temporarily.
Free production would require a separate, approved daily backup/storage route.
No provider resources or paid upgrades have been created.

Use separate staging and production projects/databases and signing secrets.
Preview branches must use staging or a separate disposable database, never
production. Store DATABASE_URL and AUTH_SECRET in scoped provider secret settings;
never NEXT_PUBLIC variables, task notes, screenshots, build logs or Git.
Environment changes require a new deployment and scope verification:
[Vercel environment variables](https://vercel.com/docs/environment-variables).

Production database connections reject an absent/blank DATABASE_URL. Local
PGLITE_DIR is only for development/test. AUTH_SECRET must be present in production.
Do not weaken secure cookies to test authentication over local HTTP.
Node production startup preflight validates config without opening a database.
Next may retain its listener after failure; health checks must require a successful
HTTP response, not merely an open port or the CLI Ready line. Run
`npm run test:production-config` after building to verify rejection paths.

## Candidate and migration

Verified staging candidate: `6eec71f897e12a6a4ad23dd916c7b5c6afad7f5e`,
branch `codex/release-baseline`,
[successful Node22 CI](https://github.com/mhotard/meals-planner/actions/runs/37161614515).
Use `npm ci` and `npm run build` (default Turbopack) as the verified build route.
G1 acceptance is recorded by the coordinator in task05; G2 remains unverified.
Required secret names: `DATABASE_URL` and `AUTH_SECRET` (at least32 UTF-8 bytes,
generated randomly). Scope staging and production separately. `PGLITE_DIR` is
not a hosted-production setting. Applied order is `0000_init`, then
`0001_natural_matthew_murdock`; migrate once with the named operator.
All existing sessions require a new login after the authentication release.

Require G1 evidence matching the exact candidate SHA. Check installation, lint,
fresh route types, TypeScript, unit/integration tests, production build and the
browser suite. Staging HTTPS tests separately prove production-mode cookies.
Record compiler mode and deployment build command.

One named operator applies committed migrations against the designated staging
database. Never run migrations at build/boot. Run fresh and repeated migrations
against a separate disposable hosted test database first. Record migration names
and Drizzle journal state; do not rewrite applied SQL or use schema push.

Create synthetic accounts and demo data in staging only. Use securely supplied
credentials; suppress command argument and fixture output in logs. Do not run
demo seed against household production.

Deploy the exact SHA to staging. Record URL/deployment ID/SHA and nonsecret
environment-scope inventory. Verify hosted-driver transactions, rollback,
canonical ingredient uniqueness/concurrency, throttling and redeploy persistence.
Run the full release browser flow against HTTPS in production mode.

## Data and promotion

Do not read/export the household database until the migration choice is made.
For a fresh start, migrate an empty production database and create the intended
members securely. For migration, keep the source unchanged, back it up, rehearse
logical export/import into an isolated hosted database, preserve IDs and foreign
keys, reset sequences, and compare counts/relationships. Embedded PGlite does
not provide a normal pg_dump connection. Record the tested migration procedure
before touching production.

Back up existing production before applying a new migration. Publish only after
G2 restore and rollback rehearsals pass. Record actual production URL/deployment
ID/SHA, migration state, bounded HTTPS smoke and operator acceptance. A staging
build does not authorize a production-complete claim.
