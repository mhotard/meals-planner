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
Each readiness request has a two-second timeout within the 90-second deadline.
Password inputs use native input events to avoid secret-bearing fill/type logs;
retention checks report a boolean only. Generated secrets are masked before use
when `GITHUB_ACTIONS=true`; local runs emit no masking command or secret value.

The snapshot helper stops Next before opening PGlite, closes the connection,
restarts Next, and compares a digest of household tables and account fields.
Account password hashes and session versions are included only in memory so
unauthorized account/password changes are detected; only the digest is returned.
No passwords, cookies, database dumps, traces, videos, or saved sessions
are written to committed artifacts. Failure screenshots use only synthetic data
and go to ignored `test-results/`; upload only PNG screenshots to CI artifacts.
The private temporary Next log is removed with the fixture directory.

`actions.ts` is deliberately specific to this installed Next version's dev
Flight transport: it uses the installed React `encodeReply`, resolves the current
compiled export from the server-action manifest, and sends the actual request,
including malformed arguments that
HTML forms cannot emit. No server-only/auth stub or test endpoint is involved.
Feature routes are recompiled after snapshot restarts. Signed-out/invalid/expired
cases verify proxy protection. A correctly signed nonexistent-user cookie passes
signature verification and verifies the action's database-backed `requireUser`.
Action error assertions resolve the Flight root action promise; unrelated page
error-boundary props cannot satisfy the assertion.

Coverage includes recipe CRUD/notes/cook history/search; Monday plan creation;
recipe and keyboard custom entries; recipe deduplication; mixed compatible units;
distinct count units; weekly minima; pantry restore; checked/skipped/restored
state, uncheck-all, pantry return-to-prompt, and extra addition/removal after
reload; signed-out read-only shares, actual denied share-context mutation with
unchanged database digest, and invalid tokens;
clipboard text/Trello exports; desktop 1280px and phone 390px widths; print CSS;
crafted invalid writes and unauthorized action requests; Settings input rejection
and session revocation; durable login throttling with generic errors; visible form
errors and correction with values retained; actual CLI password reset after the
server is stopped, with old sessions rejected and a replacement login working.
Print assertions verify
CSS media visibility, not the browser/OS print-preview dialog. Chromium is the
initial release browser; Firefox/WebKit are not covered by this suite.
