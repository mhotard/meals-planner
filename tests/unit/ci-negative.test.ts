import assert from "node:assert/strict";
import { test } from "node:test";

test("intentional release-gate failure rehearsal", () => {
  assert.fail("INTENTIONAL_RELEASE_GATE_FAILURE");
});
