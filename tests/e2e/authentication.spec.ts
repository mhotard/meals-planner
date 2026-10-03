import { test, expect, login } from "./fixture";
import { callAction, form } from "./actions";

test("protected routes, redirect destinations, login and logout", async ({ page, harness }) => {
  for (const path of ["/", "/recipes", "/plans", "/pantry", "/settings"]) {
    await page.goto(harness.url + path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
  for (const destination of ["https://example.invalid/", "//example.invalid/", "/\\example.invalid/", "javascript:alert(1)", "/login?next=/recipes", "/share/not-a-private-page"]) {
    await page.goto(`${harness.url}/login?next=${encodeURIComponent(destination)}`);
    await page.getByLabel("Email", {exact: true}).fill(harness.email);
    await page.getByLabel("Password", {exact: true}).fill(harness.password);
    await page.getByRole("button", {name: "Sign in", exact: true}).click();
    await expect(page).toHaveURL(harness.url + "/");
    await page.getByTitle(new RegExp("click to sign out")).click();
    await expect(page).toHaveURL(harness.url + "/login");
  }
  await login(page, harness, "/recipes?search=qa");
  await page.getByTitle(new RegExp("click to sign out")).click();
  await page.goto(harness.url + "/recipes");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("Settings invalid values do not write; password changes revoke both sessions", async ({ page, browser, harness }) => {
  await login(page, harness, "/settings");
  const second = await browser.newContext();
  try {
    const other = await second.newPage();
    await login(other, harness, "/settings");
    const before = await harness.snapshot();
    await page.goto(harness.url + "/settings");
    const invalid: [string, FormData][] = [
      ["addMember", form({name: "", email: "new@example.invalid", password: harness.password})],
      ["addMember", form({name: "New QA", email: "not-an-email", password: harness.password})],
      ["addMember", form({name: "New QA", email: "new@example.invalid", password: "short"})],
      ["addMember", form({name: "New QA", email: "new@example.invalid", password: "😀".repeat(19)})],
      ["changePassword", form({current: "wrong-password", next: harness.password + "new"})],
      ["changePassword", form({current: harness.password, next: "short"})],
    ];
    for (const [name, data] of invalid) {
      const response = await callAction(page.request, harness.url, name, [{}, data]);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain('"error"');
    }
    expect(await harness.snapshot()).toBe(before);
    await page.goto(harness.url + "/settings");
    const changed = harness.password + "new";
    await page.getByLabel("Current password", {exact: true}).fill(harness.password);
    await page.getByLabel("New password", {exact: true}).fill(changed);
    await page.getByRole("button", {name: "Change password", exact: true}).click();
    await expect(page).toHaveURL(harness.url + "/login");
    const afterChange = await harness.snapshot();
    // Login compiles the action module; the retained second cookie has version 0.
    await login(page, {...harness, password: changed}, "/recipes/new");
    const denied = await callAction(other.request, harness.url, "createRecipe", [{}, form({name: "Revoked session QA", "ing-name": "", "ing-quantity": "", "ing-unit": "", "ing-note": ""})]);
    expect(denied.headers()["x-action-redirect"]).toContain("/login");
    expect(await harness.snapshot()).toBe(afterChange);
    await other.goto(harness.url + "/settings");
    await expect(other).toHaveURL(harness.url + "/login");
    await page.goto(harness.url + "/recipes");
    await expect(page).toHaveURL(harness.url + "/recipes");
  } finally { await second.close(); }
});
