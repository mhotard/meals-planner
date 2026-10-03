import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { CATEGORIES } from "@/lib/categories";
import { SUPPLY } from "@/lib/supply";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One durable account-keyed limiter; each attempt locks its row in a transaction. */
export const loginAttempts = pgTable("login_attempts", {
  accountKey: text("account_key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
});

/** Canonical pantry of ingredients, shared across all recipes. */
export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** Grocery-aisle grouping, used to sort the shopping list. */
    category: text("category", { enum: CATEGORIES }).notNull().default("other"),
    /**
     * How this ingredient gets bought — see SUPPLY in lib/supply.ts.
     *   weekly     buy every week no matter what's planned (milk, eggs)
     *   pantry     kept in stock, replaced every month or two (olive oil)
     *   per_recipe buy only when a recipe calls for it (chicken, broccoli)
     */
    supply: text("supply", { enum: SUPPLY }).notNull().default("per_recipe"),
    /** Amount to buy each week — only meaningful for `weekly`. */
    weeklyQuantity: numeric("weekly_quantity", { precision: 10, scale: 2 }),
    weeklyUnit: text("weekly_unit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("ingredients_name_lower_idx").on(sql`lower(${t.name})`)],
);

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  /** Free-form family notes: "kids liked it", "halve the chili next time". */
  notes: text("notes"),
  sourceUrl: text("source_url"),
  servings: integer("servings"),
  prepMinutes: integer("prep_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  quantity: numeric("quantity", { precision: 10, scale: 3 }),
  unit: text("unit"),
  /** Prep note that rides along with the ingredient: "finely diced". */
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** One row each time we actually cooked/ate a recipe. */
export const cookLogs = pgTable("cook_logs", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  cookedOn: date("cooked_on").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  rating: smallint("rating"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  /** Monday of the planned week. */
  weekStart: date("week_start").notNull().unique(),
  notes: text("notes"),
  /** Secret slug for the read-only share link. */
  shareToken: text("share_token").notNull().unique(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mealPlanEntries = pgTable("meal_plan_entries", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  /** 0 = Monday … 6 = Sunday. */
  dayOfWeek: integer("day_of_week").notNull(),
  recipeId: integer("recipe_id").references(() => recipes.id, { onDelete: "cascade" }),
  /** Used instead of a recipe for "leftovers", "eat out", etc. */
  customLabel: text("custom_label"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Ad-hoc shopping list additions that don't come from a recipe. */
export const planExtraItems = pgTable("plan_extra_items", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => mealPlans.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }),
  unit: text("unit"),
  category: text("category", { enum: CATEGORIES }).notNull().default("other"),
});

/**
 * Per-week overrides on the computed shopping list. `itemKey` is the stable id
 * the shopping-list builder assigns to each line (see server/shopping.ts).
 */
export const planItemStates = pgTable(
  "plan_item_states",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    checked: boolean("checked").notNull().default(false),
    /** Dropped from the list this week (e.g. a staple we already have). */
    excluded: boolean("excluded").notNull().default(false),
  },
  (t) => [uniqueIndex("plan_item_states_plan_key_idx").on(t.planId, t.itemKey)],
);
