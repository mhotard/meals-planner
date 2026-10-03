import { test, expect, login, fillSecret } from "./fixture";
import { callAction, form, actionResult } from "./actions";

test("protected routes, redirect destinations, login and logout", async ({ page, harness }) => {
  for (const path of ["/", "/recipes", "/plans", "/pantry", "/settings"]) {
    await page.goto(harness.url + path);
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  }
  for (const destination of ["https://example.invalid/", "//example.invalid/", "/\\example.invalid/", "javascript:alert(1)", "/%2fexample.invalid/", "/recipes%0aevil"]) {
    await page.goto(`${harness.url}/login?next=${encodeURIComponent(destination)}`);
    await page.getByLabel("Email", {exact: true}).fill(harness.email);
    await fillSecret(page.getByLabel("Password", {exact: true}), harness.password);
    await page.getByRole("button", {name: "Sign in", exact: true}).click();
    await expect(page).toHaveURL(harness.url + "/");
    await page.getByTitle(new RegExp("click to sign out")).click();
    await expect(page).toHaveURL(harness.url + "/login");
  }
  await login(page, harness, "/recipes?search=qa");
  await page.getByTitle(new RegExp("click to sign out")).click();
  await expect(page).toHaveURL(harness.url + "/login");
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
      expect(typeof (await actionResult(response)).error).toBe("string");
    }
    expect(await harness.snapshot()).toBe(before);
    await page.goto(harness.url + "/settings");
    const changed = harness.password + "new";
    await fillSecret(page.getByLabel("Current password", {exact: true}), harness.password);
    await fillSecret(page.getByLabel("New password", {exact: true}), changed);
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

test("login throttling is durable and returns the same error for missing accounts", async ({page,harness}) => {
  const before = await harness.snapshot();
  await page.goto(harness.url+"/login");
  let generic: unknown;
  for (let index=0; index<10; index++) {
    const response = await callAction(page.request,harness.url,"login",[{},form({email:harness.email,password:harness.password+"wrong",next:"/recipes"})]);
    const result = await actionResult(response);
    expect(typeof result.error).toBe("string");
    if (index===0) generic=result.error;
    expect(result.error).toBe(generic);
  }
  expect(await harness.snapshot()).toBe(before);
  await page.goto(harness.url+"/login");
  const blocked = await callAction(page.request,harness.url,"login",[{},form({email:harness.email,password:harness.password,next:"/recipes"})]);
  expect((await actionResult(blocked)).error).toBe(generic);
  const missing = await callAction(page.request,harness.url,"login",[{},form({email:"missing@example.invalid",password:harness.password,next:"/recipes"})]);
  expect((await actionResult(missing)).error).toBe(generic);
  expect(await harness.snapshot()).toBe(before);
});

test("actual account CLI reset revokes prior sessions and allows the new password", async ({page,browser,harness}) => {
  await login(page,harness,"/recipes");
  const second=await browser.newContext();
  try {
    const other=await second.newPage();
    await login(other,harness,"/recipes");
    const replacement=await harness.resetPassword();
    await page.goto(harness.url+"/recipes");
    await expect(page).toHaveURL(harness.url+"/login");
    await other.goto(harness.url+"/recipes");
    await expect(other).toHaveURL(harness.url+"/login");
    await login(page,{...harness,password:replacement},"/recipes");
    await expect(page.getByRole("heading",{name:"Recipes",exact:true})).toBeVisible();
  } finally {await second.close();}
});
