import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { createConnection, type Connection } from "../../src/db/create";
import { findIngredientByName, findOrCreateIngredient } from "../../src/db/ingredients";
import * as schema from "../../src/db/schema";

test("a fresh local database migrates, persists recipes, and enforces ingredient relationships", async (t) => {
  // Never load .env files or connect to the household/production database here.
  const directory = await mkdtemp(join(tmpdir(), "meals-planner-test-"));
  const originalUrl = process.env.DATABASE_URL;
  const originalDirectory = process.env.PGLITE_DIR;
  delete process.env.DATABASE_URL;
  process.env.PGLITE_DIR = directory;
  let connection: Connection | undefined;

  t.after(async () => {
    try {
      await connection?.close();
    } finally {
      if (originalUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalUrl;
      if (originalDirectory === undefined) delete process.env.PGLITE_DIR;
      else process.env.PGLITE_DIR = originalDirectory;
      await rm(directory, { recursive: true, force: true });
    }
  });

  connection = await createConnection();
  await connection.migrate();
  await connection.migrate(); // Re-running setup must preserve existing schema.
  let db = connection.db;
  const ingredientId = await findOrCreateIngredient(db, "Carrots");
  assert.equal(await findIngredientByName(db, " CARROTS "), ingredientId);
  assert.equal(await findOrCreateIngredient(db, "carrots"), ingredientId);

  const [recipe] = await db.insert(schema.recipes).values({ name: "Roasted carrots" }).returning();
  await db.insert(schema.recipeIngredients).values({ recipeId: recipe.id, ingredientId, quantity: "2", unit: "lb" });

  await connection.close();
  connection = undefined;
  connection = await createConnection();
  db = connection.db;
  const [persisted] = await db.select().from(schema.recipes).where(eq(schema.recipes.id, recipe.id));
  assert.equal(persisted.name, "Roasted carrots");

  // Used ingredients cannot be deleted; deleting a recipe removes its lines.
  await assert.rejects(db.delete(schema.ingredients).where(eq(schema.ingredients.id, ingredientId)));
  await db.delete(schema.recipes).where(eq(schema.recipes.id, recipe.id));
  assert.deepEqual(await db.select().from(schema.recipeIngredients), []);
  assert.equal(await findIngredientByName(db, "Carrots"), ingredientId);
});
