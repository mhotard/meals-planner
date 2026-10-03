import assert from "node:assert/strict";
import test from "node:test";
import { field, InputError, integerValue, parseQuantity, positiveId, quantityValue, validate } from "../../src/lib/form";
import { categoryValue, dateValue, dayValue, itemKeyValue, itemStatePatch, sourceUrlValue, supplyValue, unitValue, validateRecipeInput, weekValue } from "../../src/lib/validation";

function recipeForm() {
  const data = new FormData();
  Object.entries({ name: "Synthetic soup", servings: "4", prepMinutes: "0", sourceUrl: "https://example.com/soup", "ing-name": "Beans", "ing-quantity": "1 1/2", "ing-unit": "CAN", "ing-note": "drained" }).forEach(([key, value]) => data.append(key, value));
  return data;
}

test("supported kitchen quantities distinguish blank and invalid values", () => {
  assert.equal(parseQuantity("1 1/2"), 1.5);
  assert.equal(parseQuantity("1/3"), 1 / 3);
  assert.equal(quantityValue("1/3"), "0.333");
  assert.equal(quantityValue("1/3", "Weekly quantity", 2), "0.33");
  assert.equal(quantityValue(""), null);
  for (const raw of ["1/0", "1 1/0", "Infinity", "NaN", "-1", "0", "0/2", "0x10", "1e2", "1.", "1/", "1,000", "1.0001", "99999999", "1/99999999999999999"]) {
    assert.throws(() => quantityValue(raw), InputError, raw);
  }
  assert.equal(quantityValue("9999999.999"), "9999999.999");
  assert.equal(quantityValue("1.5000"), "1.5");
});

test("scalar readers reject duplicate or file values instead of stringifying", () => {
  const data = recipeForm();
  data.append("name", "Another");
  assert.throws(() => field(data, "name"), InputError);
  data.set("name", new Blob(["data"]), "file.txt");
  assert.throws(() => field(data, "name"), InputError);
});

test("IDs, bounded integers, dates and links reject crafted input", () => {
  for (const raw of [0, -1, 1.5, NaN, Infinity, "1", 2147483648]) assert.throws(() => positiveId(raw), InputError);
  assert.equal(positiveId(2147483647), 2147483647);
  assert.equal(integerValue("", "Servings", 1, 1000), null);
  for (const raw of ["0", "1.5", "1/2", "1001", "Infinity"]) assert.throws(() => integerValue(raw, "Servings", 1, 1000), InputError);
  assert.equal(integerValue("0", "Minutes", 0, 10080), 0);
  assert.equal(dateValue("2024-02-29"), "2024-02-29");
  for (const raw of ["2025-02-29", "2026-02-30", "2026-13-01", "2026-01-00", "0099-01-01", "2026-1-01", ""]) assert.throws(() => dateValue(raw), InputError);
  assert.equal(weekValue("2026-09-28"), "2026-09-28");
  assert.throws(() => weekValue("2026-09-29"), InputError);
  assert.equal(sourceUrlValue(""), null);
  assert.equal(sourceUrlValue("https://example.com/recipe"), "https://example.com/recipe");
  for (const raw of ["javascript:alert(1)", "ftp://example.com", "//example.com", "https://u:p@example.com", "not a url", "https://example.com/\npath", "https://example.com/has space"]) assert.throws(() => sourceUrlValue(raw), InputError);
});

test("enum, day, unit and shopping patch validation is explicit", () => {
  assert.equal(categoryValue("other"), "other");
  assert.equal(supplyValue("weekly"), "weekly");
  assert.throws(() => categoryValue("typo"), InputError);
  assert.throws(() => supplyValue("often"), InputError);
  assert.equal(unitValue(" Clove "), "clove");
  assert.equal(unitValue("bottle (750 ml)"), "bottle (750 ml)");
  assert.throws(() => unitValue("can\u0000"), InputError);
  assert.throws(() => unitValue("x".repeat(41)), InputError);
  for (const raw of [-1, 7, 1.1, "1"]) assert.throws(() => dayValue(raw), InputError);
  assert.deepEqual(itemStatePatch({ checked: false }), { checked: false });
  for (const raw of [{}, { checked: "false" }, { checked: true, planId: 2 }, [], null]) assert.throws(() => itemStatePatch(raw), InputError);
  for (const raw of ["extra:0", "whatever", "ing:1:family:other", "extra:1:2"]) assert.throws(() => itemKeyValue(raw), InputError);
  assert.equal(itemKeyValue("ing:1:unit:clove"), "ing:1:unit:clove");
});

test("recipe contract validates every row before a caller can write", () => {
  const data = recipeForm();
  const result = validateRecipeInput(data);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.prepMinutes, 0);
    assert.equal(result.value.description, null);
    assert.deepEqual(result.value.ingredients, [{ name: "Beans", quantity: "1.5", unit: "can", note: "drained" }]);
  }
  for (const [key, raw] of [["ing-quantity", "1/0"], ["ing-name", ""], ["servings", "1.5"], ["sourceUrl", "javascript:alert(1)"], ["name", "x".repeat(201)]]) {
    const invalid = recipeForm(); invalid.set(key, raw);
    assert.equal(validateRecipeInput(invalid).ok, false, key);
  }
  data.delete("ing-note");
  assert.equal(validateRecipeInput(data).ok, false);
  const blank = new FormData(); blank.set("name", "No ingredients");
  for (const key of ["ing-name", "ing-quantity", "ing-unit", "ing-note"]) blank.set(key, "");
  const empty = validateRecipeInput(blank);
  assert.equal(empty.ok, true);
  if (empty.ok) assert.deepEqual(empty.value.ingredients, []);
  blank.set("ing-quantity", "0");
  assert.equal(validateRecipeInput(blank).ok, false);
  assert.equal(validate(() => { throw new InputError("bad"); }).ok, false);
  assert.throws(() => validate(() => { throw new Error("unexpected"); }), /unexpected/);
});

test("ingredient arrays reject extra rows, missing fields and file entries", () => {
  const extra = recipeForm();
  extra.append("ing-unit", "cup");
  assert.equal(validateRecipeInput(extra).ok, false);
  const file = recipeForm();
  file.set("ing-name", new Blob(["Beans"]), "ingredient.txt");
  assert.equal(validateRecipeInput(file).ok, false);
  const many = recipeForm();
  for (let i = 0; i < 100; i++) {
    for (const [key, value] of [["ing-name", "Beans"], ["ing-quantity", "1"], ["ing-unit", "can"], ["ing-note", ""]]) many.append(key, value);
  }
  assert.equal(validateRecipeInput(many).ok, false);
});
