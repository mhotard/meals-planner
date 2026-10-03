# 04 — Automate household browser regressions

Status: queued. Owner: unassigned (browser QA).
Dependencies: scaffold after accepted 00; final acceptance after accepted 01–03.
Branch/worktree and baseline commit: unassigned.

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

Results: not run. Return scripts/config, installation instructions, suite
inventory, runtime/compiler modes, candidate SHA, results, artifacts, and
production-cookie coverage still assigned to 06. Coordinator acceptance: pending.
