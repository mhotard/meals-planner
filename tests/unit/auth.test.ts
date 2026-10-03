import assert from "node:assert/strict";
import { test } from "node:test";
import { SignJWT } from "jose";
import { memberName, normalizeEmail, passwordError, safeLoginDestination } from "../../src/lib/auth-input";
import { SESSION_DAYS, signSessionToken, verifySessionToken } from "../../src/lib/auth-token";

test("login destination preserves local paths and queries and rejects external or malformed variants", () => {
  for (const path of ["/", "/plans/2026-10-05?tab=shopping", "/recipes?q=chicken%20soup", "/recipes#notes", "/recipes?q=//example.com"]) {
    assert.equal(safeLoginDestination(path), path);
  }
  for (const path of [undefined, [], "https://example.com", "//example.com", "///example.com", "/\\example.com", "/%5cexample.com", "/%2fexample.com", "/%2e%2e//example.com", "/.%2e//example.com", "/path\n", "/%0d%0aLocation:evil", "/bad%", "/%ff", " /recipes", "/recipes "]) {
    assert.equal(safeLoginDestination(path), "/", String(path));
  }
});

test("auth setup canonicalizes email/name and rejects bcrypt-truncated passwords", () => {
  assert.equal(normalizeEmail(" Member@Example.COM "), "member@example.com");
  for (const email of ["", "not-email", "a@b", "a b@c.test", "a@b\n.test", new Blob(), `${"a".repeat(255)}@b.test`]) assert.equal(normalizeEmail(email), null);
  assert.equal(memberName(" Member "), "Member");
  assert.equal(memberName(""), null);
  assert.equal(memberName("a".repeat(101)), null);
  assert.equal(passwordError("a".repeat(8)), null);
  assert.equal(passwordError("a".repeat(72)), null);
  assert.ok(passwordError("a".repeat(73)));
  assert.equal(passwordError("é".repeat(36)), null);
  assert.ok(passwordError("é".repeat(37)));
  assert.ok(passwordError("short"));
  assert.ok(passwordError(new Blob()));
});

test("JWT verification requires bounded subject, expiry, issuer/audience and session version", async () => {
  const secret = crypto.getRandomValues(new Uint8Array(32));
  const user = { id: 1, name: "Synthetic Member", email: "member@example.test", sessionVersion: 2 };
  const token = await signSessionToken(user, secret);
  assert.deepEqual(await verifySessionToken(token, secret), user);
  assert.equal(await verifySessionToken(token + "x", secret), null);
  assert.equal(await verifySessionToken(token, crypto.getRandomValues(new Uint8Array(32))), null);
  assert.equal(await verifySessionToken(token, secret, new Date(Date.now() + (SESSION_DAYS + 1) * 86400000)), null);
  const now = Math.floor(Date.now() / 1000);
  const valid = { sub: "1", name: user.name, email: user.email, version: 2, iss: "meal-planner", aud: "meal-planner-session", iat: now, exp: now + 1000 };
  const invalid = [
    { sub: "0" }, { sub: "-1" }, { sub: "1.5" }, { sub: "01" }, { sub: "NaN" }, { sub: "2147483648" },
    { version: undefined }, { version: -1 }, { version: "2" }, { version: 1.5 },
    { exp: undefined }, { exp: now - 1 }, { exp: now + (SESSION_DAYS + 1) * 86400 },
    { iat: undefined }, { iat: now + 10 }, { name: 7 }, { email: undefined }, { iss: "other" }, { aud: "other" },
  ];
  for (const claims of invalid) {
    const malformed = await new SignJWT({ ...valid, ...claims }).setProtectedHeader({ alg: "HS256" }).sign(secret);
    assert.equal(await verifySessionToken(malformed, secret), null, JSON.stringify(claims));
  }
  const wrongAlgorithm = await new SignJWT(valid).setProtectedHeader({ alg: "HS384" }).sign(secret);
  assert.equal(await verifySessionToken(wrongAlgorithm, secret), null);
});
