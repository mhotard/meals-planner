# 01 — Harden authentication and sessions

Status: review. Owner: authentication worker `/root/auth`.
Dependencies: accepted 00 (`868d22614355dac71ee3a72dd63cda51cdfd1e30`).
Branch: `codex/01-authentication`; worktree: `/private/tmp/meals-task01`.
Implementation commit: `0b2f226738ea981975b1962eb2b7bee3a0e401e6`.
Coordinator acceptance and application-runtime checks remain pending.

## Goal and ownership

Prevent external login redirects, limit failed attempts, and revoke old sessions
on password changes. Own `src/server/auth.ts`, `src/proxy.ts`, login routes,
settings actions/forms, auth-specific pure helpers/tests, and CLI account reset
in `scripts/seed-user.ts` as needed. Request the schema/migration lock for a
durable limiter/session version. Do not edit 02's domain validators or 04's suite.

## Plan

1. Inventory private pages/actions and verify authorization independently of
   the proxy. Preserve the existing one-household permission model.
2. Replace `next.startsWith("/")` with a same-origin path policy: valid local
   paths/queries work; protocol-relative, backslash, external, control-character,
   and malformed destinations do not.
3. Validate JWT claims/subject/expiry; private actions must reject deleted users.
   Preserve cookie flags and the required production signing secret.
4. Add durable failed-login throttling across serverless workers. Provisional
   policy: ten failures per account in 15 minutes; document expiry/recovery.
   A process-local Map is insufficient. Do not trust arbitrary IP headers.
   Keep public responses for missing accounts and bad passwords indistinguishable.
5. Implement session-version or equivalent revocation on password change and
   CLI reset. Record migration behavior for existing cookies.
6. Make auth-specific email/password validation consistent across member/CLI
   setup; add focused redirect, token, limiter, revocation, and action regressions.
7. Hand accepted auth behavior and synthetic fixtures to 04.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 01.1 | Local redirects work; external/malformed variants do not | Unit cases and login browser check |
| 01.2 | Invalid/expired tokens and unauthorized actions cannot write | Auth tests and disposable before/after DB assertions |
| 01.3 | Throttling survives independent workers and concurrent attempts; expiry permits recovery | Durable-store tests with controlled time |
| 01.4 | Password change/CLI reset invalidate prior sessions; new login works | Two-session regression using synthetic accounts |
| 01.5 | Auth integrates cleanly | `npm run check`, build, migration fresh/re-run tests if needed; 04 handoff |

## Handoff and acceptance

Implementation is ready for integration review. No household database was opened.
All tests use a newly created system-temporary PGlite directory and generated
synthetic passwords. Tests never load `.env` files except the actual CLI child,
which receives explicit `DATABASE_URL=` and disposable `PGLITE_DIR` overrides.
No database files, passwords, cookies, traces, or session-storage artifacts are
committed.

### Behavior and migration

Apply existing migration `0000`, then the generated
`drizzle/0001_natural_matthew_murdock.sql`. It adds `users.session_version` with
default zero and the durable `login_attempts` table; it preserves household data.
Fresh migration and re-running migration are covered by integration tests.
JWT cookies created before this implementation lack required issuer/audience/
version claims and require a new login after deployment.

A private request first verifies JWT signature and claims, then looks up the
current user and matching session version. `requireUser()` rejects deleted or
revoked users. Proxy performs only the signature/claim check and does not open
the database; private pages and actions retain their own database-backed gate.
The authorization inventory confirmed authenticated private pages, direct
recipe/pantry/settings actions, and plan action helpers. Task 02 was notified
and confirmed moving plan validation after authentication for early-return
paths. Inline plan/shopping actions delegate to the protected plan actions.

JWT policy: HS256 only; issuer `meal-planner`; audience `meal-planner-session`;
canonical positive integer user subject within Postgres integer range;
nonempty string name/email; nonnegative integer version; required integer
issued-at/expiry; no future issued-at; positive lifetime no longer than 30 days.
Cookies remain HttpOnly, SameSite=Lax, Path=/, Secure in production, with a
30-day maximum age. Production signing-secret reads throw for missing/blank or
fewer than 32 UTF-8 bytes, outside token-verification exception handling.
Length cannot establish entropy: deployment operators must generate a random
secret, for example using `openssl rand -base64 32`.

Limiter policy: ten failed password checks in a fixed 15-minute window for a
normalized email. A SHA-256 account key identifies the database row; arbitrary
IP headers are ignored. A transactional upsert locks that row throughout the
bcrypt check and counter update, so independent hosted workers serialize the
same account. A locked account rejects even a correct password until expiry;
success outside lockout resets failures. Missing accounts run a fixed synthetic
bcrypt hash check and receive the same public error as bad passwords and
throttled attempts. Invalid email/password form shapes return that same error
without running a password check. The window resets on the next eligible
attempt, without background timers.

Limiter rows persist for attempted valid email addresses, including nonexistent
accounts. No retention scheduler was added in this packet. Expired rows can be
removed by an operator maintenance command using the predicate
`window_started_at < now() - interval '15 minutes'`; active-window rows must be
preserved. Task 06/07 can establish periodic cleanup alongside hosted operations
if needed. Account-key rows therefore grow until cleanup; this is recorded
rather than claiming automatic cleanup exists.

Password changes use an optimistic version guard, atomically replace the hash
and increment the version, clear the current cookie, and redirect to `/login`.
All previously issued sessions require a new login. The CLI reset also increments
version on conflict. New members and CLI setup share normalized valid email,
trimmed name of 1–100 characters, and password policy of at least 8 characters
and at most 72 UTF-8 bytes (bcrypt's byte limit); passwords are never trimmed.
Login continues supporting existing shorter passwords, within the 72-byte
limit. Existing longer-password accounts need a reset. Concurrent member creation
returns the existing-address error instead of surfacing a unique-key failure.

### Verification evidence

Environment: macOS local worktree, Node `v25.5.0`, npm `11.8.0`, installed Next.js
`16.3.0`; tests use PGlite only. Commands ran from `/private/tmp/meals-task01`
on the code tree committed as `0b2f226738ea981975b1962eb2b7bee3a0e401e6` during
the October 2–3, 2026 implementation session. Coordinator must rerun integrated
checks, including the supported Node 22 CI target.

| Exact command | Result | Evidence |
| --- | --- | --- |
| `npm ci` | Exit 0; 386 packages installed with committed lockfile | Tool command output; root package files unchanged |
| `npm run db:generate` | Exit 0; generated new `0001` SQL and snapshot/journal entry | `drizzle/0001_natural_matthew_murdock.sql`, `drizzle/meta/0001_snapshot.json` |
| `npm run check` (final implementation run) | Exit 0; ESLint, fresh Next route types, TypeScript, all 15 tests passed | `tests/unit/auth.test.ts`, `tests/integration/auth.test.ts`, existing tests; auth integration test took about 15.2 seconds |
| `DATABASE_URL= PGLITE_DIR=/private/tmp/meals-auth-build npm run build -- --webpack` (restricted sandbox) | Exit 1; Google Fonts DNS unavailable (`ENOTFOUND fonts.googleapis.com`) | Actual failed command output; not a pass |
| Same build command with approved network access | Exit 0; Webpack compiled, TypeScript passed, all routes and proxy generated | Actual command output and ignored `.next/` build artifacts |
| `git diff --check` | Exit 0 | Final worktree diff check |

An earlier auth check had 14/15 passing because the independent-worker fixture
used unsupported top-level await in the repository's CJS runtime. The fixture
was changed to async `main()`; the final full check above passed. An earlier
pre-test implementation check had 11/11 passing; it is superseded by the final
15-test result.

Focused tests verify local paths/queries (including encoded query spaces),
external/protocol-relative/backslash/control-character/malformed redirects,
email/name/password shapes, strict JWT claims and expiry, 12 concurrent failed
login calls capped at ten, correct-password lockout, independent Node worker
restarts seeing the same lockout, exact expiry-boundary recovery, password
version conflict rejection, revocation of two session claims, new login, actual
CLI reset revocation, invalid CLI input causing no writes, and deleted-user
lookup rejection. Tests do not remove `server-only` or stub authorization.

Local concurrency uses one supported PGlite process; independent processes are
sequential reopen/restart checks because PGlite supports one process per
directory. Simultaneous independent hosted-Postgres connections require staging
driver evidence in task 06 and have not been claimed as a local pass.

### Browser fixture contract and pending checks

Task 04 was sent the contract directly. Use disposable databases and synthetic
users created after migration; obtain cookies by normal login. If fabricating
negative tokens, use the strict JWT contract above and synthetic signing secret.
A signature-valid nonexistent user tests the database gate even when proxy
passes. Password-change success navigates to `/login`; both browser contexts
must fail old authenticated actions until login with the new password.
CLI reset must run only after stopping a PGlite preview, or use hosted disposable
Postgres with independent supported connections.

Required remaining application-runtime checks: login local and malicious
redirect destinations; invalid/expired/no-cookie and deleted-user action POSTs
with before/after database assertions; two browser sessions revoked through the
actual Settings action; new login after password change; runtime CLI-reset
revocation; invalid Settings/member inputs with no writes; integrated migration,
check/build, and browser suite. Pure helper/database tests above do not establish
that exported Next actions reject unauthorized writes.

Coordinator acceptance: pending integrated review and task 04 runtime evidence.
Shared-schema lock can be released after integration of the new migration.
Suggested documentation integration: update architecture/development auth policy
with session-version revocation, 72-byte bcrypt limit, production secret length,
and limiter retention; those shared docs remain coordinator-owned.
