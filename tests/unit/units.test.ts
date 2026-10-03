import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAmount, fromBase, toBase, unitGroupKey } from "../../src/lib/units";

test("compatible recipe quantities combine into the largest supplied unit", () => {
  const total = toBase(2, "lb") + toBase(8, "oz");
  const { quantity, unit } = fromBase(total, ["lb", "oz"]);
  assert.equal(formatAmount(quantity, unit), "2½ lb");
});

test("mass, volume, and count units remain separate", () => {
  assert.equal(unitGroupKey(" KG "), unitGroupKey("g"));
  assert.equal(unitGroupKey("cup"), unitGroupKey("tbsp"));
  assert.notEqual(unitGroupKey("oz"), unitGroupKey("fl oz"));
  assert.notEqual(unitGroupKey("can"), unitGroupKey("clove"));
  assert.notEqual(unitGroupKey(null), unitGroupKey("can"));
});

test("small totals use a smaller supplied unit; unspecified amounts stay blank", () => {
  assert.deepEqual(fromBase(toBase(4, "oz"), ["lb", "oz"]), { quantity: 4, unit: "oz" });
  assert.equal(formatAmount(null, null), "");
  assert.equal(formatAmount(null, "clove"), "clove");
});
