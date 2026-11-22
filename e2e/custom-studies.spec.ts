import {test,expect} from "@playwright/test";

test("safe formula studies add, render on every chart, persist, toggle and delete",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await page.getByRole("textbox",{name:"Custom study name"}).fill("EMA Spread");
  await page.getByRole("textbox",{name:"Custom study expression"}).fill("EMA(close,13)-SMA(close,34)");
  await page.getByRole("button",{name:"Add custom study"}).click();
  await expect(page.getByRole("checkbox",{name:"Enable custom study EMA Spread"})).toBeChecked();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.customStudies).toHaveLength(1);
  await page.getByRole("button",{name:"Close indicator menu"}).click();
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(2);
  await page.reload();
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await expect(page.getByRole("checkbox",{name:"Enable custom study EMA Spread"})).toBeChecked();
  await page.getByRole("checkbox",{name:"Enable custom study EMA Spread"}).uncheck();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.customStudies[0].enabled).toBe(false);
  await page.getByRole("checkbox",{name:"Enable custom study EMA Spread"}).check();
  await page.getByRole("button",{name:"Delete custom study EMA Spread"}).click();
  await expect(page.getByRole("checkbox",{name:"Enable custom study EMA Spread"})).toHaveCount(0);
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.customStudies).toHaveLength(0);
});

test("unsafe expressions are rejected without storing or evaluating scripts",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await page.getByRole("textbox",{name:"Custom study name"}).fill("Unsafe script");
  await page.getByRole("textbox",{name:"Custom study expression"}).fill("window.location");
  await page.getByRole("button",{name:"Add custom study"}).click();
  await expect(page.getByText(/unsupported token|unknown field/i)).toBeVisible();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.customStudies).toHaveLength(0);
});
