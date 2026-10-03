# 04 — Automate household browser regressions

Status: in_progress. Owner: `/root/browser` (browser QA).
Dependencies: scaffold after accepted 00; final acceptance after accepted 01–03.
Branch/worktree: `codex/04-browser-tests`, `/private/tmp/meals-task04`.
Baseline commit: `868d22614355dac71ee3a72dd63cda51cdfd1e30` (accepted G0).

## Goal and ownership

Make manual flows repeatable with isolated data. Own new `tests/e2e/`, fixtures,
and `playwright.config.ts`. Obtain a temporary grant for package/lockfile, ignore
rules, and test scripts/configuration. Request locator/accessibility changes
from feature owners; CI belongs to 05.

## Plan

1. Read installed Next.js `01-app/02-guides/testing/playwright.md`. Add Playwright
   to this app; do not scaffold a replacement project.
2. Add proposed command `npm run test:e2e`. Fixtures create a temporary database,
   clear inherited `DATABASE_URL`, migrate, create synthetic users/recipes,
   start the server, run tests, stop the server, and clean up even on failure.
3. Use one PGlite process per directory. Serialize tests sharing a server or give
   each worker its own server/database. Disable unsafe existing-server reuse and
   refuse production targets for destructive fixture setup/teardown.
4. Test login/logout, protected routes and action authorization, recipe CRUD,
   notes/cook logs, recipe/custom plan entries, and shopping computation/state.
   Cover compatible mixed units, weekly minima, pantry restore, checked/skip/
   extras persistence, and text/Trello exports.
5. Use a separate signed-out share context; assert disabled mutation controls,
   failed unauthorized writes, and invalid-token behavior.
6. Check desktop and narrow-phone layouts, keyboard/form access, and print styles.
   Prefer role/label locators and behavioral assertions over fixed sleeps or
   implementation snapshots. Save failure traces/screenshots using synthetic data.
7. A development-server suite can run first. Add production-mode tests where
   secure cookies work; never disable cookie security to get a pass. Mandatory
   HTTPS production-mode evidence is completed in 06. Explain local coverage limits.
8. Test the integrated 01–03 fixes before requesting final acceptance.

## Verification milestones

| ID | Pass condition | Method / evidence |
| --- | --- | --- |
| 04.1 | Harness works from clean checkout with no household data/server reuse | Proposed `npm run test:e2e`; isolation and cleanup assertions |
| 04.2 | Main flows and unauthorized writes have behavioral checks | Named specs, state/DB assertions, signed-out context |
| 04.3 | Desktop/mobile and print/export checks pass | Browser results and screenshots/traces; document print-preview limits |
| 04.4 | Integrated fixes pass without timing flakiness | Full suite twice for initial stability; `npm run check` and build |

## Handoff and acceptance

Coordinator acceptance: pending. Scaffold/spec work in progress; final
verification must run on the integrated 01–03 candidate.

- Dependency commit: `bc55ad0f08778e3c24567261c8b9cc0b49ce9a11`.
  Package/lockfile grant released back to coordinator; coordinator owns the
  subsequent Next/security update. No application/schema edits in this packet.
- Environment: macOS arm64, Node 22+, PGlite in per-test OS temporary directories,
  synthetic random credentials, Chromium headless 153.0.8010.12/Playwright v1243,
  development Webpack loopback HTTP. No household database was opened.
- `npm ci`: passed, 386 baseline dependencies installed.
- `npm install -D @playwright/test`: initial sandbox DNS ENOTFOUND; escalated
  retry passed. `npx playwright install chromium`: escalated download passed.
- `npx playwright test tests/e2e/household.spec.ts --grep 'recipe create'`:
  first sandbox launch failed (macOS MachPort permission); escalated retry passed
  1 test (22.2s), recipe CRUD, notes, cook-log history, search and deletion.
- `npm run check`: passed, lint/fresh route types/TypeScript and 11 baseline tests.
  A preceding lint run failed because the Playwright callback named `use` was
  mistaken for React's hook; renamed the callback and reran successfully.
- Initial desktop flow failed on expected decimal rendering (product renders
  `2½ lb`/`½`); corrected preserved output expectations. A concurrent command
  was refused by Next's build directory lock, with cleanup completed. Serialized
  corrected desktop run passed 1 test (20.9s), including shopping computation,
  persistence, public share, exports, and print CSS.
- Signed-out direct-action transport debug found public-route forwarding can
  stop at proxy before dispatch; helper now posts compiled feature routes.
  Signed-out proxy protection passed (1 test, 33.3s); independent action auth
  evidence uses a signed nonexistent-user fixture token and requires integrated
  task 01. Guard suite plus Settings/revocation results pending integration.

Suite inventory, isolation contract, commands, compiler settings, artifact
policy, and coverage limits: `tests/e2e/README.md`. Only failure PNG screenshots
in ignored `test-results/` may be uploaded; traces/session state are disabled.
HTTPS production cookies and OS print preview remain unverified (task 06).
