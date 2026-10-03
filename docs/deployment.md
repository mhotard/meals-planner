# Hosted release runbook (prepared; deployment pending)

Status: draft. No provider resources or HTTPS URLs have been verified.
Use [release evidence](release-evidence.md) for actual gate results.

## Inputs and environment isolation

Before provisioning, record account/project owner, provider plans and region,
monthly spending limit, publication scope, operator and initial-data decision.
Use a provider subdomain initially unless a domain is selected. Current account
access, Next 16.3 compatibility, pricing and retention must be checked at execution.
Vercel/Neon remain candidates, not configured accounts.

Use separate staging and production projects/databases and signing secrets.
Preview branches must use staging or a separate disposable database, never
production. Store DATABASE_URL and AUTH_SECRET in scoped provider secret settings;
never NEXT_PUBLIC variables, task notes, screenshots, build logs or Git.
Environment changes require a new deployment and scope verification:
[Vercel environment variables](https://vercel.com/docs/environment-variables).

Production database connections reject an absent/blank DATABASE_URL. Local
PGLITE_DIR is only for development/test. AUTH_SECRET must be present in production.
Do not weaken secure cookies to test authentication over local HTTP.

## Candidate and migration

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
