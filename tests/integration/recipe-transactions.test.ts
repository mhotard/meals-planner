import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { eq, sql } from "drizzle-orm";
import { createConnection, type Connection, type DB } from "../../src/db/create";
import { findIngredientByName, findOrCreateIngredient } from "../../src/db/ingredients";
import { saveValidatedRecipe } from "../../src/db/recipes";
import { validateRecipeInput } from "../../src/lib/validation";
import type { ValidatedRecipeInput } from "../../src/lib/validation";
import * as schema from "../../src/db/schema";

function recipeInput(name: string, ingredientNames: string[]): ValidatedRecipeInput {
  const data = new FormData();
  data.set("name", name);
  data.set("description", `${name} description`);
  data.set("notes", `${name} notes`);
  data.set("servings", "4");
  data.set("prepMinutes", "0");
  data.set("sourceUrl", "https://example.test/synthetic-recipe");
  for (const [i, ingredient] of ingredientNames.entries()) {
    data.append("ing-name", ingredient);
    data.append("ing-quantity", i === 0 ? "1 1/2" : "1/3");
    data.append("ing-unit", i === 0 ? "can" : "cup");
    data.append("ing-note", `Synthetic prep ${i}`);
  }
  const input = validateRecipeInput(data);
  assert.ok(input.ok);
  return input.value;
}

async function snapshot(db: DB) {
  return {
    recipes: await db.select().from(schema.recipes).orderBy(schema.recipes.id),
    lines: await db.select().from(schema.recipeIngredients).orderBy(schema.recipeIngredients.id),
    ingredients: await db.select().from(schema.ingredients).orderBy(schema.ingredients.id),
  };
}

// Installed only in a disposable database. There is no app-accessible failure
// flag or callback: Postgres raises a real constraint error on the second line.
async function installLineFailure(db: DB) {
  await db.execute(sql`
    create function test_fail_second_recipe_line() returns trigger as $$
    begin
      if new.sort_order = 1 then
        raise exception 'Synthetic second recipe line failure' using errcode = '23514';
      end if;
      return new;
    end;
    $$ language plpgsql
  `);
  await db.execute(sql`
    create trigger test_fail_recipe_line before insert on recipe_ingredients
    for each row execute function test_fail_second_recipe_line()
  `);
}

async function removeLineFailure(db: DB) {
  await db.execute(sql`drop trigger test_fail_recipe_line on recipe_ingredients`);
  await db.execute(sql`drop function test_fail_second_recipe_line()`);
}

function constraintFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = error.cause;
  return !!cause && typeof cause === "object" && "code" in cause && cause.code === "23514";
}

test("recipe saves commit or roll back recipes, replacement lines and canonical ingredients together", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "meals-recipe-transaction-test-"));
  const originalUrl = process.env.DATABASE_URL;
  const originalDirectory = process.env.PGLITE_DIR;
  process.env.DATABASE_URL = "";
  process.env.PGLITE_DIR = directory;
  let connection: Connection | undefined;
  t.after(async () => {
    try { await connection?.close(); } finally {
      if (originalUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalUrl;
      if (originalDirectory === undefined) delete process.env.PGLITE_DIR; else process.env.PGLITE_DIR = originalDirectory;
      await rm(directory, { recursive: true, force: true });
    }
  });
  connection = await createConnection();
  await connection.migrate();
  await connection.migrate();
  let db = connection.db;
  const originalInput = recipeInput("Synthetic original", ["Stored Bean", "Stored Rice"]);
  const original = await saveValidatedRecipe(db, originalInput, { kind: "create" });
  assert.ok("id" in original);
  const originalId = original.id;
  const storedBeanId = await findIngredientByName(db, "stored bean");
  assert.ok(storedBeanId);
  await db.update(schema.ingredients).set({ supply: "weekly", category: "pantry", weeklyQuantity: "2.00", weeklyUnit: "can" }).where(eq(schema.ingredients.id, storedBeanId));

  await t.test("failed update preserves full recipe, old lines and ingredient purchasing rules", async () => {
    const before = await snapshot(db);
    await installLineFailure(db);
    try {
      await assert.rejects(
        saveValidatedRecipe(db, recipeInput("Synthetic rejected update", ["Fresh Update Bean", "Fresh Update Rice"]), { kind: "update", recipeId: originalId }),
        constraintFailure,
      );
      assert.deepEqual(await snapshot(db), before);
      assert.equal(await findIngredientByName(db, "Fresh Update Bean"), null);
      assert.equal(await findIngredientByName(db, "Fresh Update Rice"), null);
    } finally { await removeLineFailure(db); }
  });

  await t.test("failed create leaves no recipe, line or newly created canonical ingredient", async () => {
    const before = await snapshot(db);
    await installLineFailure(db);
    try {
      await assert.rejects(
        saveValidatedRecipe(db, recipeInput("Synthetic rejected create", ["Fresh Create Bean", "Fresh Create Rice"]), { kind: "create" }),
        constraintFailure,
      );
      assert.deepEqual(await snapshot(db), before);
      assert.equal(await findIngredientByName(db, "Fresh Create Bean"), null);
      assert.equal(await findIngredientByName(db, "Fresh Create Rice"), null);
    } finally { await removeLineFailure(db); }
  });

  await t.test("missing or deleted update targets return a controlled error without creating orphans", async () => {
    const before = await snapshot(db);
    const missing = await saveValidatedRecipe(db, recipeInput("Missing update", ["Missing Target Bean"]), { kind: "update", recipeId: 2147483647 });
    assert.deepEqual(missing, { error: "Recipe no longer exists." });
    assert.deepEqual(await snapshot(db), before);
    const temporary = await saveValidatedRecipe(db, recipeInput("Deleted update", []), { kind: "create" });
    assert.ok("id" in temporary);
    await db.delete(schema.recipes).where(eq(schema.recipes.id, temporary.id));
    const beforeDeleted = await snapshot(db);
    assert.deepEqual(await saveValidatedRecipe(db, recipeInput("Deleted update attempt", ["Deleted Target Bean"]), { kind: "update", recipeId: temporary.id }), { error: "Recipe no longer exists." });
    assert.deepEqual(await snapshot(db), beforeDeleted);
  });

  await t.test("successful replacement preserves recipe identity/canonical rules and persists after reopening", async () => {
    const [canonicalBefore] = await db.select().from(schema.ingredients).where(eq(schema.ingredients.id, storedBeanId));
    const updatedInput = recipeInput("Synthetic revised", [" Stored Bean ", "STORED BEAN", "Fresh Success Rice"]);
    const updated = await saveValidatedRecipe(db, updatedInput, { kind: "update", recipeId: originalId });
    assert.deepEqual(updated, { id: originalId });
    const [recipe] = await db.select().from(schema.recipes).where(eq(schema.recipes.id, originalId));
    const { ingredients: inputLines, ...expectedRecipe } = updatedInput;
    assert.deepEqual({ name: recipe.name, description: recipe.description, notes: recipe.notes, sourceUrl: recipe.sourceUrl, servings: recipe.servings, prepMinutes: recipe.prepMinutes }, expectedRecipe);
    const lines = await db.select().from(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, originalId)).orderBy(schema.recipeIngredients.sortOrder);
    assert.equal(lines.length, inputLines.length);
    assert.deepEqual(lines.map((line) => ({ ingredientId: line.ingredientId, quantity: Number(line.quantity), unit: line.unit, note: line.note, sortOrder: line.sortOrder })), inputLines.map((line, sortOrder) => ({ ingredientId: sortOrder < 2 ? storedBeanId : lines[2].ingredientId, quantity: Number(line.quantity), unit: line.unit, note: line.note, sortOrder })));
    assert.equal(await findIngredientByName(db, "fresh success rice"), lines[2].ingredientId);
    assert.deepEqual((await db.select().from(schema.ingredients).where(eq(schema.ingredients.id, storedBeanId)))[0], canonicalBefore);
    const beforeReopen = await snapshot(db);
    await connection!.close(); connection = undefined;
    connection = await createConnection(); db = connection.db;
    assert.deepEqual(await snapshot(db), beforeReopen);
  });

  await t.test("concurrent mixed-case ingredient requests return one canonical row and ID", async () => {
    const names = ["Concurrent Mint", "CONCURRENT MINT", " concurrent mint ", "Concurrent mint"];
    const ids = await Promise.all(names.map((name) => findOrCreateIngredient(db, name)));
    assert.equal(new Set(ids).size, 1);
    const canonical = await db.select().from(schema.ingredients).where(sql`lower(${schema.ingredients.name}) = 'concurrent mint'`);
    assert.equal(canonical.length, 1);
    assert.equal(canonical[0].id, ids[0]);
    assert.ok(names.some((name) => name.trim() === canonical[0].name));
  });

  await t.test("concurrent recipe saves share canonical ingredients despite reversed input order", async () => {
    const inputs = [recipeInput("Synthetic concurrent A", ["Concurrent Basil", "Concurrent Thyme"]), recipeInput("Synthetic concurrent B", [" concurrent thyme ", "CONCURRENT BASIL"])];
    const results = await Promise.all(inputs.map((input) => saveValidatedRecipe(db, input, { kind: "create" })));
    for (const result of results) assert.ok("id" in result);
    const basilId = await findIngredientByName(db, "concurrent basil");
    const thymeId = await findIngredientByName(db, "concurrent thyme");
    assert.ok(basilId); assert.ok(thymeId);
    assert.notEqual(basilId, thymeId);
    const rows = await db.select().from(schema.ingredients).where(sql`lower(${schema.ingredients.name}) in ('concurrent basil', 'concurrent thyme')`);
    assert.equal(rows.length, 2);
    for (const [i, result] of results.entries()) {
      assert.ok("id" in result);
      const lines = await db.select().from(schema.recipeIngredients).where(eq(schema.recipeIngredients.recipeId, result.id)).orderBy(schema.recipeIngredients.sortOrder);
      assert.deepEqual(lines.map((line) => line.ingredientId), i === 0 ? [basilId, thymeId] : [thymeId, basilId]);
    }
  });
});
