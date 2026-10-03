import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByCategory, partitionList, type ShoppingItem } from "../../src/lib/shopping";
import { shoppingAsText, shoppingForTrello } from "../../src/lib/export";

function item(name: string, overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    key: name, name, category: "produce", amount: "", fromRecipes: [],
    supply: "per_recipe", isExtra: false, checked: false, excluded: false, ...overrides,
  };
}

const items = [
  item("Carrots", { amount: "2 lb" }),
  item("Milk", { category: "dairy & eggs", supply: "weekly", checked: true }),
  item("Rice", { category: "pantry", supply: "pantry", excluded: true }),
  item("Olive oil", { category: "pantry", supply: "pantry" }),
  item("Broccoli", { excluded: true }),
];

test("pantry prompts stay separate, while restored pantry items join the list", () => {
  const { toBuy, pantryCheck } = partitionList(items);
  assert.deepEqual(pantryCheck.map((entry) => entry.name), ["Rice"]);
  assert.deepEqual(toBuy.map((entry) => entry.name), ["Carrots", "Milk", "Olive oil", "Broccoli"]);
});

test("shopping groups follow aisle order regardless of input order", () => {
  const groups = groupByCategory([...items].reverse());
  assert.deepEqual(groups.map(([category]) => category), ["produce", "dairy & eggs", "pantry"]);
  assert.equal(groups.flatMap(([, group]) => group).length, items.length);
});

test("Trello receives only unchecked purchases, including restored pantry items", () => {
  assert.equal(shoppingForTrello(items), "Carrots (2 lb)\nOlive oil");
});

test("text exports include checked purchases but omit skipped items and pantry prompts", () => {
  assert.equal(shoppingAsText("2026-09-28", items), [
    "Shopping list — week of Sep 28 – Oct 4", "", "PRODUCE", "- Carrots (2 lb)", "",
    "DAIRY & EGGS", "- Milk", "", "PANTRY", "- Olive oil",
  ].join("\n"));
});
