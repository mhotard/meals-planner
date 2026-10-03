# 11 — Add self-service account recovery

Status: proposed (optional). Owner: unassigned (authentication).
Dependencies: accepted 07/G3 and household selection. Branch/worktree: unassigned.

## Goal and ownership

Recover existing members' access without revealing which emails have accounts.
The existing operator-assisted CLI is the initial-release recovery option.
Own recovery routes/actions, auth helpers, email adapter, and tests. Request
schema/migration and dependency/configuration locks. Public signup is out of scope.

## Plan

1. Resolve mail provider/account, budget, sender identity, and delivery requirements.
   Prepare the adapter/tests while inputs are pending; a stub does not verify delivery.
2. Generate cryptographically random tokens; store only hashes, account, expiry,
   and consumed state. Proposed expiry: 30 minutes. Use durable request throttling
   and generic responses for known/unknown accounts.
3. Build reset links from a trusted configured origin, not arbitrary host headers.
   Keep tokens out of logs/analytics and credentials out of task notes/Git.
4. Atomically consume a token and change the password; revoke other reset tokens
   and prior sessions using 01's mechanism. Concurrent submissions allow one success.
5. Add accessible request/reset forms and invalid/expired-link states. Preserve
   the operator recovery runbook as a fallback.
6. Verify actual email delivery in staging to an authorized test recipient and
   then HTTPS reset/login. Live mail is not part of ordinary PR checks.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 11.1 | Known/unknown requests have equivalent responses and durable throttling | Auth integration/browser tests with controlled time |
| 11.2 | Expired/reused/concurrent tokens cannot change passwords; success revokes prior sessions | Token/transaction/two-session regressions |
| 11.3 | Trusted-origin mail reaches staging account and new login works | Real delivery receipt and HTTPS flow; no tokens/secrets in evidence |
| 11.4 | Recovery integrates without enabling signup/access expansion | `npm run check`, E2E delivered by 04, build, fresh/re-run migration and auth tests |

## Handoff and acceptance

Results: not run. Return nonsecret provider/sender IDs, policy, migration/commit,
automated/real-delivery evidence, fallback runbook, and defects. Acceptance: pending.
Not required for the initial hosted release.
