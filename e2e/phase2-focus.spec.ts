import {test,expect} from "@playwright/test";

test("phase 2 focus mode preserves all chart workspace controls and drawings",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await expect(page.getByRole("button",{name:"Enter chart focus mode"})).toBeVisible();
  await page.getByRole("button",{name:"Enter chart focus mode"}).click();
  await expect(page.locator(".app.focus-mode")).toBeVisible();
  await expect(page.locator(".primary-sidebar")).toBeHidden();
  await expect(page.locator(".right-panel")).toBeHidden();
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
  await page.getByRole("button",{name:"Exit chart focus mode"}).click();
  await expect(page.locator(".app.focus-mode")).toHaveCount(0);
  await expect(page.locator(".primary-sidebar")).toBeVisible();
  await expect(page.getByRole("button",{name:"Enter chart focus mode"})).toBeVisible();
});

test("focus mode re-enters terminal from another page without discarding local state",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Overview",exact:true}).click();
  await expect(page.getByText("A clear view of your markets.")).toBeVisible();
  await page.getByRole("button",{name:"Enter chart focus mode"}).click();
  await expect(page.locator(".app.focus-mode")).toBeVisible();
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
});

test("Shift+F toggles focus except while entering text",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.keyboard.press("Shift+F");
  await expect(page.locator(".app.focus-mode")).toBeVisible();
  await page.keyboard.press("Shift+F");
  await expect(page.locator(".app.focus-mode")).toHaveCount(0);
  await page.getByRole("button",{name:"Search markets & tools"}).click();
  const search=page.getByRole("dialog",{name:"Search instruments and tools"}).getByRole("combobox");
  await search.focus();
  await page.keyboard.press("Shift+F");
  await expect(page.locator(".app.focus-mode")).toHaveCount(0);
});
