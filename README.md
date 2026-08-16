# Meal Planner

A private family meal planner: keep your recipes, plan a week, and turn that
week into a shopping list you can share or paste into Trello.

## What it does

- **Recipes** — ingredients with real quantities and units, a source link, and
  free-form notes ("halve the chili next time").
- **Cook log** — record the nights you actually made something, with an optional
  rating and note. The home page surfaces what's in rotation and what you
  haven't made in a while.
- **Pantry** — the shared list of every ingredient. Flag the ones you restock
  every week as **staples**; they land on every shopping list automatically.
- **Weekly plans** — assign recipes to days, or type free-form entries like
  "leftovers" or "pizza out".
- **Shopping list** — combines the week's ingredients (adding up compatible
  units, so 2 lb + 8 oz becomes 2.5 lb), adds the staples, and groups
  everything by grocery aisle. Check items off, skip what you already have, add
  one-off items.
- **Sharing** — every week gets a secret read-only link that needs no login,
  plus copy-as-text and Trello-shaped exports, plus a print view.
- **Logins** — email + password, two or more accounts, all sharing one
  household's recipes and plans.

## Running it locally

```bash
npm install
npm run db:migrate     # creates the local database in .pglite/
npm run user you@example.com "Your Name" your-password
npm run seed           # optional: sample recipes and staples
npm run dev
```

Then open http://localhost:3000.

With no `DATABASE_URL` set, the app runs on **PGlite** — a real Postgres
compiled to WebAssembly, stored in `.pglite/`. Nothing to install.

> **One process at a time.** PGlite can only be opened by a single process.
> Stop `npm run dev` before running `db:migrate`, `user`, or `seed`, or the
> scripts will refuse to start. This restriction disappears once `DATABASE_URL`
> points at a hosted Postgres.

## Deploying

The app runs on any Postgres. For a free setup:

1. Create a Postgres database (e.g. Neon) and copy its connection string.
2. Deploy this repo to Vercel.
3. Set two environment variables in Vercel:
   - `DATABASE_URL` — the connection string
   - `AUTH_SECRET` — `openssl rand -base64 32`
4. Run the migration and create the logins against production:

   ```bash
   DATABASE_URL="postgres://…" npm run db:migrate
   DATABASE_URL="postgres://…" npm run user you@example.com "Your Name" a-good-password
   ```

New household members can also be added from **Settings** once you're signed in.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run db:generate` | Generate a SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run user <email> <name> <password>` | Create or reset a login |
| `npm run seed` | Add sample recipes and staples |

## Layout

```
src/
  app/(app)/        signed-in pages: home, recipes, plans, pantry, settings
  app/login/        sign in
  app/share/[token] public read-only week
  components/       shared UI (shopping list, copy buttons, nav)
  db/               Drizzle schema and the driver switch
  lib/              units, dates, categories, shopping-list builder, exports
  proxy.ts          route protection
scripts/            migrate, seed, create user
drizzle/            generated SQL migrations
```

### Notes on a couple of decisions

- **Units.** Quantities are stored as a number plus a unit. The shopping list
  adds up units within the same family (mass, volume) and renders the total in
  the largest unit you actually wrote down. Count-ish units ("clove", "can")
  only combine with themselves, which avoids nonsense totals.
- **Shopping-list state.** The list is recomputed from the plan every time, so
  editing a recipe updates it. Only your overrides — checked, skipped, and
  ad-hoc additions — are stored, keyed to a stable id per line.
