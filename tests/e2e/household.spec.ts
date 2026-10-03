import { test, expect, login } from "./fixture";
import type { Page } from "@playwright/test";

const week = "2030-01-07";

async function addMeal(page: Page, index: number, name: string, custom = false) {
  await page.getByRole("button", { name: "+ Add a meal", exact: true }).nth(index).click();
  const dialog = page.getByRole("dialog");
  const search = dialog.getByRole("textbox", { name: "Search recipes" });
  await search.fill(name);
  // Exercise the picker keyboard path for both recipe and custom entries.
  if (custom) await search.press("Enter");
  else await dialog.getByRole("button", { name: new RegExp(name) }).first().click();
  await expect(dialog).not.toBeVisible();
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`household plan, shopping, share, exports and print at ${viewport.width}px`, async ({ page, browser, harness }) => {
    await page.setViewportSize(viewport);
    await login(page, harness, "/plans");
    await page.getByLabel("or week of").fill("2030-01-09");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await expect(page).toHaveURL(`${harness.url}/plans/${week}`);
    await addMeal(page, 0, "Roast QA");
    await addMeal(page, 1, "Soup QA");
    await addMeal(page, 2, "Roast QA");
    await addMeal(page, 3, "Leftovers QA", true);
    await expect(page.getByText("4 meals planned")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Leftovers QA", {exact: true})).toBeVisible();
    const sharePath = await page.getByRole("link", {name: "Preview", exact: true}).getAttribute("href");
    await page.getByRole("link", { name: "Shopping list", exact: true }).click();
    const chicken = page.getByRole("checkbox", {name: "Got Chicken QA"});
    await expect(chicken.locator("..")).toContainText("2½ lb");
    await expect(page.getByRole("checkbox", {name: "Got Milk QA"}).locator("..")).toContainText("2 cup");
    const garlic = page.getByRole("checkbox", {name: "Got Garlic QA"});
    await expect(garlic).toHaveCount(2);
    await expect(garlic.nth(0).locator("..")).toContainText("1 clove");
    await expect(garlic.nth(1).locator("..")).toContainText("1 head");
    await expect(page.getByRole("checkbox", {name: "Got Rice QA"})).toHaveCount(0);
    await page.getByRole("button", {name: /Rice QA/}).click();
    await expect(page.getByRole("checkbox", {name: "Got Rice QA"})).toBeVisible();
    await chicken.check();
    await expect(chicken).toBeChecked();
    // The server's persisted progress provides an acknowledgement before reload.
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    await page.reload();
    await expect(chicken).toBeChecked();
    const milkRow = page.getByRole("checkbox", {name: "Got Milk QA"}).locator("../..");
    await milkRow.getByRole("button", {name: "skip", exact: true}).click();
    await expect(milkRow.getByRole("button", {name: "restore", exact: true})).toBeVisible();
    await page.reload();
    await expect(milkRow.getByRole("button", {name: "restore", exact: true})).toBeVisible();
    await milkRow.getByRole("button", {name: "restore", exact: true}).click();
    await expect(milkRow.getByRole("button", {name: "skip", exact: true})).toBeVisible();
    await page.getByRole("textbox", {name: "Item", exact: true}).fill("Candles QA");
    await page.getByRole("textbox", {name: "Quantity", exact: true}).fill("1/2");
    await page.getByRole("button", {name: "Add", exact: true}).click();
    await expect(page.getByRole("checkbox", {name: "Got Candles QA"})).toBeVisible();
    await page.reload();
    await expect(page.getByRole("checkbox", {name: "Got Candles QA"}).locator("..")).toContainText("½");

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", {name: "Copy for Trello", exact: true}).click();
    await expect(page.getByRole("button", {name: "Copied ✓", exact: true})).toBeVisible();
    const trello = await page.evaluate(() => navigator.clipboard.readText());
    expect(trello).toContain("Candles QA");
    expect(trello).not.toContain("Chicken QA");
    expect(trello).not.toMatch(/^[-#]/m);
    await page.getByRole("button", {name: "Copy as text", exact: true}).click();
    await expect(page.getByRole("button", {name: "Copy for Trello", exact: true})).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("Chicken QA");
    expect(text).toContain("Shopping list — week of Jan 7");
    await page.getByRole("button", {name: "Copy meals for Trello", exact: true}).click();
    await expect(page.getByRole("button", {name: "Copy as text", exact: true})).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Leftovers QA");

    await page.emulateMedia({media: "print"});
    await expect(page.getByRole("button", {name: "Print", exact: true})).not.toBeVisible();
    await expect(page.getByRole("heading", {name: "Shopping list", exact: true})).toBeVisible();
    await page.emulateMedia({media: "screen"});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const signedOut = await browser.newContext({viewport});
    try {
      const share = await signedOut.newPage();
      await share.goto(harness.url + sharePath);
      await expect(share.getByText(/shared, view only/)).toBeVisible();
      await expect(share.getByText("Leftovers QA", {exact: true})).toBeVisible();
      for (const checkbox of await share.getByRole("checkbox").all()) await expect(checkbox).toBeDisabled();
      await expect(share.getByRole("button", {name: /skip|restore|Add a meal|Uncheck all/})).toHaveCount(0);
      await expect(share.locator("form")).toHaveCount(0);
      expect(await share.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await share.goto(`${harness.url}/share/invalid-qa-token`);
      await expect(share.getByRole("heading", {name: "404", exact: true})).toBeVisible();
    } finally { await signedOut.close(); }
  });
}

test("recipe create, edit, notes, cook history, search and delete", async ({ page, harness }) => {
  await login(page, harness);
  await page.goto(`${harness.url}/recipes/new`);
  await page.getByLabel("Recipe name", {exact: true}).fill("Pasta QA");
  await page.getByLabel("Serves", {exact: true}).fill("4");
  await page.getByLabel("Minutes", {exact: true}).fill("20");
  await page.getByLabel("Source link", {exact: true}).fill("https://example.invalid/recipe");
  await page.getByLabel("Ingredient", {exact: true}).fill("Pasta QA");
  await page.getByLabel("Quantity", {exact: true}).fill("1 1/2");
  await page.getByLabel("Unit", {exact: true}).selectOption("cup");
  await page.getByLabel("Quantity", {exact: true}).fill("1/0");
  await page.getByRole("button", {name: "Save recipe", exact: true}).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Recipe name", {exact: true})).toHaveValue("Pasta QA");
  await expect(page.getByLabel("Quantity", {exact: true})).toHaveValue("1/0");
  await page.getByLabel("Quantity", {exact: true}).fill("1 1/2");
  await page.getByRole("button", {name: "Save recipe", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Pasta QA", exact: true})).toBeVisible();
  const recipeUrl = page.url();
  await page.getByRole("button", {name: "Add a note", exact: true}).click();
  await page.getByPlaceholder("Halve the chili next time. Great with rice.").fill("Family note QA");
  await page.getByRole("button", {name: "Save", exact: true}).click();
  await expect(page.getByText("Family note QA", {exact: true})).toBeVisible();
  await page.getByLabel("Date we made it").fill("2030-01-08");
  await page.getByLabel("Rating", {exact: true}).selectOption("3");
  await page.getByLabel("Note", {exact: true}).fill("Loved QA");
  await page.getByRole("button", {name: "Log it", exact: true}).click();
  await expect(page.getByText(/Loved QA/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Loved QA/)).toBeVisible();
  await page.getByRole("link", {name: "Edit", exact: true}).click();
  await page.getByLabel("Recipe name", {exact: true}).fill("Pasta edited QA");
  await page.getByRole("button", {name: "Save changes", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Pasta edited QA", exact: true})).toBeVisible();
  await page.getByRole("button", {name: /Remove log/}).click();
  await expect(page.getByText("Never logged.", {exact: true})).toBeVisible();
  await page.goto(`${harness.url}/recipes`);
  await page.getByRole("textbox").fill("Pasta edited QA");
  await expect(page.getByRole("link", {name: /Pasta edited QA/})).toBeVisible();
  await page.goto(recipeUrl + "/edit");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", {name: "Delete recipe", exact: true}).click();
  await expect(page).toHaveURL(`${harness.url}/recipes`);
  await page.goto(recipeUrl);
  await expect(page.getByRole("heading", {name: "404", exact: true})).toBeVisible();
});

test("weekly item retains rejected inputs; plan form displays crafted date errors and allows correction", async ({page,harness}) => {
  await login(page,harness,"/pantry");
  const weeklyForm = page.locator("form").filter({has:page.getByLabel("Item name",{exact:true})});
  await weeklyForm.getByLabel("Item name",{exact:true}).fill("Weekly form QA");
  await weeklyForm.getByLabel("Quantity",{exact:true}).fill("1/0");
  await weeklyForm.getByRole("button",{name:"Add",exact:true}).click();
  await expect(weeklyForm.getByRole("alert")).toBeVisible();
  await expect(weeklyForm.getByLabel("Item name",{exact:true})).toHaveValue("Weekly form QA");
  await expect(weeklyForm.getByLabel("Quantity",{exact:true})).toHaveValue("1/0");
  await weeklyForm.getByLabel("Quantity",{exact:true}).fill("1 1/2");
  await weeklyForm.getByRole("button",{name:"Add",exact:true}).click();
  await expect(page.getByLabel("Weekly quantity for Weekly form QA",{exact:true})).toHaveValue("1.5");
  await page.goto(harness.url+"/plans");
  const date = page.getByLabel("or week of",{exact:true});
  // Native date inputs cannot emit impossible dates; bypass that browser guard
  // to exercise the server error rendered by this exact user-facing form.
  await date.evaluate((element) => element.setAttribute("type","text"));
  await date.fill("2030-02-30");
  await page.getByRole("button",{name:"Go",exact:true}).click();
  await expect(page.getByRole("alert")).toBeVisible();
  // React restores the native date control after the response; browsers cannot
  // display an impossible date in that control. The visible server error is
  // the regression assertion, then a normal supported date repairs the form.
  await date.evaluate((element) => element.setAttribute("type","date"));
  await date.fill("2030-03-06");
  await page.getByRole("button",{name:"Go",exact:true}).click();
  await expect(page).toHaveURL(`${harness.url}/plans/2030-03-04`);
});
