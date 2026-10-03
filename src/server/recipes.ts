import "server-only";

import { asc, desc, eq, ilike, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

export type RecipeListItem = {
  id: number;
  name: string;
  description: string | null;
  servings: number | null;
  prepMinutes: number | null;
  ingredientCount: number;
  timesCooked: number;
  lastCookedOn: string | null;
};

export async function listRecipes(query?: string): Promise<RecipeListItem[]> {
  const db = await getDb();
  const where = query?.trim() ? ilike(schema.recipes.name, `%${query.trim()}%`) : undefined;

  return db
    .select({
      id: schema.recipes.id,
      name: schema.recipes.name,
      description: schema.recipes.description,
      servings: schema.recipes.servings,
      prepMinutes: schema.recipes.prepMinutes,
      // Written as literal SQL with aliases: inside a `sql` template Drizzle
      // emits bare column names, which would bind "id" to the subquery's table.
      ingredientCount: sql<number>`(
        select count(*)::int from recipe_ingredients ri where ri.recipe_id = recipes.id
      )`,
      timesCooked: sql<number>`(
        select count(*)::int from cook_logs cl where cl.recipe_id = recipes.id
      )`,
      lastCookedOn: sql<string | null>`(
        select max(cl.cooked_on) from cook_logs cl where cl.recipe_id = recipes.id
      )`,
    })
    .from(schema.recipes)
    .where(where)
    .orderBy(asc(sql`lower(${schema.recipes.name})`));
}

export async function getRecipe(id: number) {
  const db = await getDb();
  const [recipe] = await db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.id, id))
    .limit(1);
  if (!recipe) return null;

  const ingredients = await db
    .select({
      id: schema.recipeIngredients.id,
      ingredientId: schema.ingredients.id,
      name: schema.ingredients.name,
      category: schema.ingredients.category,
      supply: schema.ingredients.supply,
      quantity: schema.recipeIngredients.quantity,
      unit: schema.recipeIngredients.unit,
      note: schema.recipeIngredients.note,
      sortOrder: schema.recipeIngredients.sortOrder,
    })
    .from(schema.recipeIngredients)
    .innerJoin(
      schema.ingredients,
      eq(schema.ingredients.id, schema.recipeIngredients.ingredientId),
    )
    .where(eq(schema.recipeIngredients.recipeId, id))
    .orderBy(asc(schema.recipeIngredients.sortOrder), asc(schema.recipeIngredients.id));

  const logs = await db
    .select({
      id: schema.cookLogs.id,
      cookedOn: schema.cookLogs.cookedOn,
      rating: schema.cookLogs.rating,
      note: schema.cookLogs.note,
      userName: schema.users.name,
    })
    .from(schema.cookLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.cookLogs.userId))
    .where(eq(schema.cookLogs.recipeId, id))
    .orderBy(desc(schema.cookLogs.cookedOn), desc(schema.cookLogs.id));

  return { recipe, ingredients, logs };
}

export type RecipeDetail = NonNullable<Awaited<ReturnType<typeof getRecipe>>>;

export async function listIngredients() {
  const db = await getDb();
  return db
    .select({
      id: schema.ingredients.id,
      name: schema.ingredients.name,
      category: schema.ingredients.category,
      supply: schema.ingredients.supply,
      weeklyQuantity: schema.ingredients.weeklyQuantity,
      weeklyUnit: schema.ingredients.weeklyUnit,
      usedIn: sql<number>`(
        select count(*)::int from recipe_ingredients ri where ri.ingredient_id = ingredients.id
      )`,
    })
    .from(schema.ingredients)
    .orderBy(asc(sql`lower(${schema.ingredients.name})`));
}

export async function recentlyCooked(limit = 5) {
  const db = await getDb();
  return db
    .select({
      id: schema.cookLogs.id,
      recipeId: schema.recipes.id,
      name: schema.recipes.name,
      cookedOn: schema.cookLogs.cookedOn,
      rating: schema.cookLogs.rating,
    })
    .from(schema.cookLogs)
    .innerJoin(schema.recipes, eq(schema.recipes.id, schema.cookLogs.recipeId))
    .orderBy(desc(schema.cookLogs.cookedOn), desc(schema.cookLogs.id))
    .limit(limit);
}

/** Recipes we haven't made in a while, to break out of the rotation rut. */
export async function staleFavorites(limit = 5) {
  const db = await getDb();
  return db
    .select({
      id: schema.recipes.id,
      name: schema.recipes.name,
      lastCookedOn: sql<string | null>`max(${schema.cookLogs.cookedOn})`,
      timesCooked: sql<number>`count(${schema.cookLogs.id})::int`,
    })
    .from(schema.recipes)
    .leftJoin(schema.cookLogs, eq(schema.cookLogs.recipeId, schema.recipes.id))
    .groupBy(schema.recipes.id, schema.recipes.name)
    .having(sql`count(${schema.cookLogs.id}) > 0`)
    .orderBy(asc(sql`max(${schema.cookLogs.cookedOn})`))
    .limit(limit);
}
