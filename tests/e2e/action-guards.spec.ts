import { test, expect, login } from "./fixture";
import { callAction, form } from "./actions";

const validRecipe = {name: "Crafted QA", servings: "4", prepMinutes: "20", sourceUrl: "https://example.invalid/qa", "ing-name": "New ingredient QA", "ing-quantity": "1 1/2", "ing-unit": "cup", "ing-note": ""};
const week = "2030-02-04";

test("crafted invalid exported actions reject without any database writes", async ({ page, harness }) => {
  await login(page, harness);
  const before = await harness.snapshot();
  // Server restart invalidates compilation; reload features before resolving IDs.
  for (const path of ["/recipes/new", "/recipes/1", "/pantry", "/settings", `/plans/${week}`, `/plans/${week}/shopping`]) await page.goto(harness.url + path);
  const cases: [string, unknown[]][] = [
    ...["1/0", "Infinity", "NaN", "1e309", "-1", "0"].map((quantity): [string, unknown[]] => ["createRecipe", [{}, form({...validRecipe, "ing-quantity": quantity})]]),
    ["createRecipe", [{}, form({...validRecipe, "ing-name": ["One QA", "Two QA"]})]],
    ["createRecipe", [{}, form({...validRecipe, servings: "1.5"})]],
    ["createRecipe", [{}, form({...validRecipe, sourceUrl: "javascript:alert(1)"})]],
    ["createRecipe", [{}, form({...validRecipe, sourceUrl: "https://user:pass@example.invalid/"})]],
    ["createRecipe", [{}, form({...validRecipe, name: ["One QA", "Two QA"]})]],
    ["updateRecipe", [1, {}, form({...validRecipe, "ing-quantity": "1/0"})]],
    // Flight preserves undefined (unlike plain JSON); otherwise valid data must
    // not fall through to the create path in the shared recipe writer.
    ["updateRecipe", [undefined, {}, form(validRecipe)]],
    ...[null, 0, -1].map((id): [string, unknown[]] => ["updateRecipe", [id, {}, form(validRecipe)]]),
    ["deleteRecipe", [0]],
    ["logCooked", [1, form({cookedOn: "2030-02-30", rating: "3"})]],
    ["logCooked", [1, form({cookedOn: "2030-02-04", rating: "4"})]],
    ["deleteCookLog", [1, 2]],
    ["createIngredient", [form({name: "Bad QA", category: "not-an-aisle", supply: "per_recipe"})]],
    ["updateIngredient", [1, form({category: "produce", supply: "never"})]],
    ["addWeeklyItem", [form({name: "Bad weekly QA", category: "other", quantity: "1/0", unit: "cup"})]],
    ["updateWeeklyAmount", [2, form({quantity: "-1", unit: "cup"})]],
    ["createPlan", ["2030-02-05"]],
    ["createPlanForDate", [form({date: "2030-02-30"})]],
    ["addRecipeToDay", [week, 7, 1]],
    ["addRecipeToDay", [week, 0, -1]],
    ["addCustomToDay", [week, 1.5, "Bad custom QA"]],
    ["removePlanEntry", [week, 2]],
    ["removeExtraItem", [week, 2]],
    ["setItemState", [week, "ing:1:family:mass", {checked: "true"}]],
    ["setItemState", [week, "ing:1:family:mass", {checked: false, unexpected: true}]],
    ["setItemState", [week, "ing:1:family:mass", {}]],
    ["setItemState", [week, "ing:999:family:mass", {checked: true}]],
    ["setItemState", [week, "extra:2", {checked: true}]],
    ["addExtraItem", [week, form({label: "Bad extra QA", quantity: "1/0", unit: "cup", category: "other"})]],
  ];
  for (const [name, args] of cases) {
    const response = await callAction(page.request, harness.url, name, args);
    expect(response.status(), name).toBe(200);
    expect(await response.text(), `${name} validation result`).toContain('"error"');
  }
  expect(await harness.snapshot()).toBe(before);
});

for (const session of ["signed-out", "invalid", "expired", "deleted-user"] as const) test(`${session} exported action requests are rejected without writes`, async ({ page, browser, harness }) => {
  await login(page, harness);
  const before = await harness.snapshot();
  for (const path of ["/recipes/new", "/recipes/1", "/pantry", "/settings", `/plans/${week}`, `/plans/${week}/shopping`]) await page.goto(harness.url + path);
  const anonymous = await browser.newContext();
  try {
    if (session !== "signed-out") await anonymous.addCookies([{name: "meals_session", value: session === "invalid" ? "invalid-qa-token" : await harness.token(session === "deleted-user" ? 999 : 1, session === "expired"), url: harness.url}]);
    const cases: [string, unknown[]][] = [
      ["createRecipe", [{}, form(validRecipe)]],
      ["updateRecipe", [1, {}, form(validRecipe)]],
      ["deleteRecipe", [1]],
      ["logCooked", [1, form({cookedOn: "2030-02-04", rating: "3"})]],
      ["deleteCookLog", [1, 1]],
      ["updateRecipeNotes", [1, form({notes: "Unauthorized QA"})]],
      ["createIngredient", [form({name: "Unauthorized QA", category: "other", supply: "per_recipe"})]],
      ["updateIngredient", [1, form({category: "other", supply: "pantry"})]],
      ["deleteIngredient", [4]],
      ["addWeeklyItem", [form({name: "Unauthorized weekly QA", category: "other", quantity: "1", unit: "cup"})]],
      ["addPantryItem", [form({name: "Unauthorized pantry QA", category: "other"})]],
      ["setSupply", [1, "weekly"]],
      ["updateWeeklyAmount", [2, form({quantity: "5", unit: "cup"})]],
      ["createPlan", ["2030-03-04"]],
      ["createPlanForDate", [form({date: "2030-03-04"})]],
      ["addRecipeToDay", [week, 0, 1]],
      ["addCustomToDay", [week, 0, "Unauthorized QA"]],
      ["removePlanEntry", [week, 1]],
      ["updatePlanNotes", [week, form({notes: "Unauthorized QA"})]],
      ["deletePlan", [week]],
      ["logWeekAsCooked", [week]],
      ["setItemState", [week, "ing:1:family:mass", {checked: true}]],
      ["addExtraItem", [week, form({label: "Unauthorized QA", quantity: "1", unit: "cup", category: "other"})]],
      ["removeExtraItem", [week, 1]],
      ["clearCheckedItems", [week]],
      ["addMember", [{}, form({name: "Unauthorized QA", email: "unauthorized@example.invalid", password: harness.password})]],
      ["changePassword", [{}, form({current: harness.password, next: harness.password + "new"})]],
    ];
    for (const [name, args] of cases) {
      const response = await callAction(anonymous.request, harness.url, name, args);
      const redirect = response.headers()["x-action-redirect"] ?? response.headers().location;
      if (!redirect) throw new Error(`${name}: no login redirect, status ${response.status()}`);
      expect(redirect, `${name} action authorization`).toContain("/login");
    }
  } finally { await anonymous.close(); }
  expect(await harness.snapshot()).toBe(before);
});
