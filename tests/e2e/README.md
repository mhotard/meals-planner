# Household browser regressions

Install from the committed lockfile and download Chromium:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

Linux CI also needs `npx playwright install --with-deps chromium`.
The suite defaults to development Webpack (`E2E_BUILD_MODE=turbopack` selects
Turbopack). Production compilation remains `npm run build`; authenticated HTTPS
production evidence belongs to task 06. The suite does not change secure-cookie
settings or claim local HTTP tests cover them.

Every test owns a new OS temporary directory, fresh migrations, random synthetic
account/password/signing secret, and a fresh loopback server on an unused port.
It forcibly clears inherited `DATABASE_URL` and overrides `PGLITE_DIR`; it does
not import the CLI environment loader. The harness has no remote target option
and never reuses another server. One worker serializes browser tests. Do not run
two suite commands in one checkout: Next's build-directory lock refuses this.
Cleanup stops the server and deletes the directory even after assertion errors.

The snapshot helper stops Next before opening PGlite, closes the connection,
restarts Next, and compares a digest of household tables and safe account
fields. No passwords, cookies, database dumps, traces, videos, or saved sessions
are written to committed artifacts. Failure screenshots use only synthetic data
and go to ignored `test-results/`; upload only PNG screenshots to CI artifacts.
The private temporary Next log is removed with the fixture directory.

`actions.ts` is deliberately specific to this installed Next version's dev
Flight transport: it resolves the current compiled export from the server-action
manifest and sends the actual action request, including malformed arguments that
HTML forms cannot emit. No server-only/auth stub or test endpoint is involved.
Feature routes are recompiled after snapshot restarts. Signed-out/invalid/expired
cases verify proxy protection. A correctly signed nonexistent-user cookie passes
signature verification and verifies the action's database-backed `requireUser`.

Coverage includes recipe CRUD/notes/cook history/search; Monday plan creation;
recipe and keyboard custom entries; recipe deduplication; mixed compatible units;
distinct count units; weekly minima; pantry restore; checked/skipped/restored
state and extras after reload; signed-out read-only shares and invalid tokens;
clipboard text/Trello exports; desktop 1280px and phone 390px widths; print CSS;
crafted invalid writes and unauthorized action requests. Print assertions verify
CSS media visibility, not the browser/OS print-preview dialog. Chromium is the
initial release browser; Firefox/WebKit are not covered by this suite.
