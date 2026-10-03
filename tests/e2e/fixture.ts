import { test as base, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { mkdtemp, rm, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { once } from "node:events";
import { hash } from "bcryptjs";
import { SignJWT } from "jose";
import { sql } from "drizzle-orm";
import { createConnection } from "../../src/db/create";
import * as schema from "../../src/db/schema";

export type Harness = {
  url: string;
  email: string;
  password: string;
  snapshot: () => Promise<string>;
  token: (subject: number, expired?: boolean) => Promise<string>;
  resetPassword: () => Promise<string>;
};

async function availablePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const address = socket.address();
  if (!address || typeof address === "string") throw new Error("No local port");
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  return address.port;
}

export const test = base.extend<{ harness: Harness }>({
  harness: [async ({ browser }, provide) => {
    // Never load CLI .env modules: fixture setup cannot inherit a hosted target.
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousPgliteDir = process.env.PGLITE_DIR;
    const directory = await mkdtemp(join(tmpdir(), "meals-e2e-"));
    const database = join(directory, "database");
    if (!resolve(directory).startsWith(resolve(tmpdir()) + "/")) throw new Error("Unsafe fixture path");
    process.env.DATABASE_URL = "";
    process.env.PGLITE_DIR = database;
    const email = `e2e-${randomBytes(6).toString("hex")}@example.invalid`;
    const password = randomBytes(24).toString("base64url");
    const env = {
      ...process.env,
      DATABASE_URL: "",
      PGLITE_DIR: database,
      AUTH_SECRET: randomBytes(32).toString("base64"),
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
      NEXT_TELEMETRY_DISABLED: "1",
    };
    let server: ChildProcess | undefined;
    let log: Awaited<ReturnType<typeof open>> | undefined;
    let port: number;
    let url: string;
    let lastTableDigests: string[] | undefined;
    async function stop() {
      if (!server || server.exitCode !== null || server.signalCode !== null) {
        server = undefined;
        return;
      }
      const child = server;
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
      try { await exited; } finally { clearTimeout(timer); server = undefined; }
    }
    async function start() {
      // Explicit port and fresh child; an occupied port is a failure, never reused.
      const compiler = process.env.E2E_BUILD_MODE === "turbopack" ? [] : ["--webpack"];
      server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...compiler, "--hostname", "127.0.0.1", "--port", String(port)], {
        cwd: process.cwd(), env, stdio: ["ignore", log!.fd, log!.fd],
      });
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        if (server.exitCode !== null || server.signalCode !== null) throw new Error("Isolated Next server exited before readiness");
        try {
          const response = await fetch(`${url}/login`);
          if (response.ok) return;
        } catch { /* Listener not ready yet. */ }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Isolated Next server readiness timed out");
    }
    async function disconnectPages() {
      for (const context of browser.contexts()) {
        for (const page of context.pages()) await page.goto("about:blank");
      }
    }
    try {
      port = await availablePort();
      url = `http://127.0.0.1:${port}`;
      log = await open(join(directory, "server.log"), "a");
      const connection = await createConnection();
      try {
        await connection.migrate();
        await connection.db.insert(schema.users).values({email, name: "Synthetic QA", passwordHash: await hash(password, 12)});
        const inserted = await connection.db.insert(schema.ingredients).values([
          { name: "Chicken QA", category: "meat & seafood" },
          { name: "Milk QA", category: "dairy & eggs", supply: "weekly", weeklyQuantity: "2", weeklyUnit: "cup" },
          { name: "Rice QA", category: "pantry", supply: "pantry" },
          { name: "Garlic QA", category: "produce" },
        ]).returning();
        for (const [index, name] of ["Roast QA", "Soup QA"].entries()) {
          const [recipe] = await connection.db.insert(schema.recipes).values({name, servings: 4}).returning();
          await connection.db.insert(schema.recipeIngredients).values([
            { recipeId: recipe.id, ingredientId: inserted[0].id, quantity: index ? "8" : "2", unit: index ? "oz" : "lb" },
            { recipeId: recipe.id, ingredientId: inserted[1].id, quantity: "0.5", unit: "cup" },
            { recipeId: recipe.id, ingredientId: inserted[2].id, quantity: "1", unit: "cup" },
            { recipeId: recipe.id, ingredientId: inserted[3].id, quantity: "1", unit: index ? "head" : "clove" },
          ]);
        }
        for (const date of ["2030-02-04", "2030-02-11"]) {
          const [plan] = await connection.db.insert(schema.mealPlans).values({weekStart: date, shareToken: randomBytes(24).toString("hex")}).returning();
          await connection.db.insert(schema.mealPlanEntries).values({planId: plan.id, dayOfWeek: 0, recipeId: 1});
          await connection.db.insert(schema.planExtraItems).values({planId: plan.id, label: "Fixture extra QA"});
        }
        await connection.db.insert(schema.cookLogs).values({recipeId: 1, cookedOn: "2030-02-04"});
      } finally { await connection.close(); }
      await start();
      await provide({url, email, password, resetPassword: async () => {
        await disconnectPages();
        await stop();
        const replacement = randomBytes(24).toString("base64url");
        try {
          // Run the actual account CLI, with the same explicit isolated env.
          // Credentials stay in memory and are never printed or stored as files.
          await new Promise<void>((resolve, reject) => {
            const child = spawn(process.execPath, ["--import", "tsx", "scripts/seed-user.ts", email, "Synthetic QA", replacement], {cwd:process.cwd(),env,stdio:["ignore",log!.fd,log!.fd]});
            const timer = setTimeout(() => child.kill("SIGKILL"), 30_000);
            child.once("error", (error) => {clearTimeout(timer);reject(error);});
            child.once("exit", (code) => {clearTimeout(timer);if(code===0)resolve();else reject(new Error("Isolated account reset CLI failed"));});
          });
        } finally { await start(); }
        return replacement;
      }, token: async (subject, expired = false) => {
        const now = Math.floor(Date.now() / 1000);
        return new SignJWT({name: "Deleted QA", email: "deleted@example.invalid", version: 0})
          .setProtectedHeader({alg: "HS256"}).setSubject(String(subject))
          .setIssuer("meal-planner").setAudience("meal-planner-session")
          .setIssuedAt(expired ? now - 3600 : now).setExpirationTime(expired ? now - 60 : now + 3600)
          .sign(new TextEncoder().encode(env.AUTH_SECRET));
      }, snapshot: async () => {
        // Disconnect dev HMR before restart so old pages cannot navigate while
        // the test is refetching fresh action references or signing in again.
        await disconnectPages();
        await stop();
        const connection = await createConnection();
        try {
          // Auth-throttle rows intentionally change on login failures. Account
          // values remain only in memory and are included in the returned digest.
          const tables = ["recipes", "ingredients", "recipe_ingredients", "cook_logs", "meal_plans", "meal_plan_entries", "plan_extra_items", "plan_item_states"];
          const rows = [];
          for (const table of tables) rows.push(await connection.db.execute(sql.raw(`select * from ${table} order by id`)));
          // Values exist only in memory; failures/reporters receive the digest.
          rows.push(await connection.db.execute(sql`select * from users order by id`));
          const tableDigests = rows.map((row) => createHash("sha256").update(JSON.stringify(row)).digest("hex"));
          if (lastTableDigests) {
            const changed = [...tables, "users"].filter((_, index) => tableDigests[index] !== lastTableDigests![index]);
            if (changed.length) console.info("Snapshot changes in:", changed.join(", "));
          }
          lastTableDigests = tableDigests;
          return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
        } finally { await connection.close(); await start(); }
      }});
    } finally {
      try { await stop(); } finally {
        try { await log?.close(); } finally {
          try { await rm(directory, { recursive: true, force: true }); } finally {
            if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
            else process.env.DATABASE_URL = previousDatabaseUrl;
            if (previousPgliteDir === undefined) delete process.env.PGLITE_DIR;
            else process.env.PGLITE_DIR = previousPgliteDir;
          }
        }
      }
      expect(await import("node:fs").then(({ existsSync }) => existsSync(directory))).toBe(false);
    }
  }, { scope: "test" }],
});

export { expect };

export async function login(page: Page, harness: Harness, target = "/recipes") {
  await page.goto(`${harness.url}/login?next=${encodeURIComponent(target)}`);
  await page.getByLabel("Email", { exact: true }).fill(harness.email);
  await page.getByLabel("Password", { exact: true }).fill(harness.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(harness.url + target);
}
