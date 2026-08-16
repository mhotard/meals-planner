/**
 * Sample recipes + staples so the app isn't empty on first run.
 *   npx tsx scripts/seed-demo.ts
 * Safe to re-run: it skips recipes that already exist by name.
 */
import { sql } from "drizzle-orm";
import { connect } from "./connect";
import * as schema from "../src/db/schema";

type Row = [qty: number | null, unit: string, name: string, note?: string];

const STAPLES: { name: string; category: string; qty?: number; unit?: string }[] = [
  { name: "milk", category: "dairy & eggs", qty: 1, unit: "gal" },
  { name: "eggs", category: "dairy & eggs", qty: 12, unit: "" },
  { name: "sandwich bread", category: "bakery", qty: 1, unit: "" },
  { name: "bananas", category: "produce", qty: 1, unit: "bunch" },
  { name: "coffee", category: "drinks", qty: 1, unit: "pkg" },
  { name: "paper towels", category: "household", qty: 1, unit: "pkg" },
];

const CATEGORY_HINTS: Record<string, string> = {
  "chicken thighs": "meat & seafood",
  "ground beef": "meat & seafood",
  salmon: "meat & seafood",
  "italian sausage": "meat & seafood",
  broccoli: "produce",
  "baby potatoes": "produce",
  "yellow onion": "produce",
  garlic: "produce",
  lemon: "produce",
  "romaine lettuce": "produce",
  "cherry tomatoes": "produce",
  cilantro: "produce",
  lime: "produce",
  avocado: "produce",
  "bell pepper": "produce",
  spinach: "produce",
  "parmesan cheese": "dairy & eggs",
  "shredded cheddar": "dairy & eggs",
  butter: "dairy & eggs",
  "heavy cream": "dairy & eggs",
  "sour cream": "dairy & eggs",
  "flour tortillas": "bakery",
  "olive oil": "pantry",
  "soy sauce": "pantry",
  "canned black beans": "pantry",
  "crushed tomatoes": "pantry",
  "chicken broth": "pantry",
  rice: "pantry",
  spaghetti: "pantry",
  "penne pasta": "pantry",
  honey: "pantry",
  "smoked paprika": "spices",
  "chili powder": "spices",
  cumin: "spices",
  oregano: "spices",
  "salt & pepper": "spices",
  "frozen peas": "frozen",
};

const RECIPES: {
  name: string;
  description: string;
  servings: number;
  prepMinutes: number;
  notes?: string;
  ingredients: Row[];
}[] = [
  {
    name: "Sheet pan chicken thighs & potatoes",
    description: "One pan, almost no cleanup. The weeknight default.",
    servings: 4,
    prepMinutes: 45,
    notes: "Crank to 425°F for the last 10 minutes to crisp the skin.",
    ingredients: [
      [2, "lb", "chicken thighs", "bone-in, skin on"],
      [1.5, "lb", "baby potatoes", "halved"],
      [1, "", "yellow onion", "wedged"],
      [3, "tbsp", "olive oil"],
      [2, "tsp", "smoked paprika"],
      [1, "", "lemon", "for squeezing"],
      [null, "", "salt & pepper"],
    ],
  },
  {
    name: "Weeknight spaghetti bolognese",
    description: "Simmered while the pasta boils.",
    servings: 4,
    prepMinutes: 40,
    notes: "Kids like it without the peppers. Freezes well — double it.",
    ingredients: [
      [1, "lb", "ground beef"],
      [1, "lb", "spaghetti"],
      [28, "oz", "crushed tomatoes"],
      [1, "", "yellow onion", "diced"],
      [4, "clove", "garlic", "minced"],
      [2, "tbsp", "olive oil"],
      [1, "tsp", "oregano"],
      [0.5, "cup", "parmesan cheese", "grated"],
    ],
  },
  {
    name: "Black bean & cheddar quesadillas",
    description: "Pantry dinner when the fridge is empty.",
    servings: 4,
    prepMinutes: 20,
    ingredients: [
      [8, "", "flour tortillas"],
      [2, "can", "canned black beans", "drained"],
      [2, "cup", "shredded cheddar"],
      [1, "tsp", "cumin"],
      [1, "tsp", "chili powder"],
      [1, "", "avocado", "sliced"],
      [0.5, "cup", "sour cream"],
      [1, "bunch", "cilantro"],
    ],
  },
  {
    name: "Lemon garlic salmon with broccoli",
    description: "Fifteen minutes, start to plate.",
    servings: 4,
    prepMinutes: 25,
    notes: "Don't overcook the salmon — pull it at 125°F.",
    ingredients: [
      [1.5, "lb", "salmon"],
      [1, "lb", "broccoli", "florets"],
      [3, "clove", "garlic", "minced"],
      [2, "tbsp", "butter"],
      [1, "", "lemon"],
      [2, "tbsp", "olive oil"],
      [null, "", "salt & pepper"],
    ],
  },
  {
    name: "Sausage & spinach penne",
    description: "Creamy, fast, uses up the spinach.",
    servings: 4,
    prepMinutes: 30,
    ingredients: [
      [1, "lb", "italian sausage", "casings removed"],
      [1, "lb", "penne pasta"],
      [5, "oz", "spinach"],
      [1, "cup", "heavy cream"],
      [3, "clove", "garlic"],
      [0.5, "cup", "parmesan cheese"],
    ],
  },
  {
    name: "Chicken fried rice",
    description: "Best with day-old rice and whatever veg is left.",
    servings: 4,
    prepMinutes: 25,
    ingredients: [
      [1, "lb", "chicken thighs", "diced"],
      [3, "cup", "rice", "cooked, cold"],
      [3, "", "eggs", "beaten"],
      [1, "cup", "frozen peas"],
      [3, "tbsp", "soy sauce"],
      [1, "", "bell pepper", "diced"],
      [2, "tbsp", "olive oil"],
    ],
  },
];

async function main() {
  const { db, close } = await connect();

  async function ingredientId(name: string): Promise<number> {
    const [found] = await db
      .select({ id: schema.ingredients.id })
      .from(schema.ingredients)
      .where(sql`lower(${schema.ingredients.name}) = ${name.toLowerCase()}`)
      .limit(1);
    if (found) return found.id;

    const [created] = await db
      .insert(schema.ingredients)
      .values({ name, category: CATEGORY_HINTS[name] ?? "other" })
      .returning({ id: schema.ingredients.id });
    return created.id;
  }

  for (const staple of STAPLES) {
    const id = await ingredientId(staple.name);
    await db
      .update(schema.ingredients)
      .set({
        isStaple: true,
        category: staple.category,
        stapleQuantity: staple.qty == null ? null : String(staple.qty),
        stapleUnit: staple.unit || null,
      })
      .where(sql`${schema.ingredients.id} = ${id}`);
  }

  let added = 0;
  for (const recipe of RECIPES) {
    const [existing] = await db
      .select({ id: schema.recipes.id })
      .from(schema.recipes)
      .where(sql`lower(${schema.recipes.name}) = ${recipe.name.toLowerCase()}`)
      .limit(1);
    if (existing) continue;

    const [created] = await db
      .insert(schema.recipes)
      .values({
        name: recipe.name,
        description: recipe.description,
        servings: recipe.servings,
        prepMinutes: recipe.prepMinutes,
        notes: recipe.notes ?? null,
      })
      .returning({ id: schema.recipes.id });

    for (const [i, [qty, unit, name, note]] of recipe.ingredients.entries()) {
      await db.insert(schema.recipeIngredients).values({
        recipeId: created.id,
        ingredientId: await ingredientId(name),
        quantity: qty == null ? null : String(qty),
        unit: unit || null,
        note: note ?? null,
        sortOrder: i,
      });
    }
    added++;
  }

  console.log(`Seeded ${added} recipes and ${STAPLES.length} staples.`);
  await close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
