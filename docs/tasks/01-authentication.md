# 01 — Harden authentication and sessions

Status: queued. Owner: unassigned (authentication).
Dependencies: accepted 00. Branch/worktree and baseline commit: unassigned.

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

Results: not run. Return commit/diff, migration order, limiter/revocation policies,
owned files, exact checks, and fixture contract. Coordinator acceptance: pending.
