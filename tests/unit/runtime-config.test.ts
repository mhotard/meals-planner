import assert from "node:assert/strict";
import { test } from "node:test";
import { requireHostedDatabase } from "../../src/lib/runtime-config";

test("production cannot fall back to household or ephemeral local storage", () => {
  for (const value of [undefined, "", "   "]) {
    assert.throws(() => requireHostedDatabase("production", value), /DATABASE_URL is required/);
  }
  assert.equal(requireHostedDatabase("production", " postgres://synthetic.invalid/test "), "postgres://synthetic.invalid/test");
});

test("development can explicitly use isolated PGlite", () => {
  assert.equal(requireHostedDatabase("development", undefined), undefined);
  assert.equal(requireHostedDatabase("test", ""), undefined);
});
