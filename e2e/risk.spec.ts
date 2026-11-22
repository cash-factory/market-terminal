import { test, expect } from "@playwright/test";

test("risk planner calculates, validates and persists a theoretical trade plan", async ({page}) => {
  await page.goto("/market-terminal/");
  await page.getByRole("button", {name:"Risk Planner"}).click();
  await expect(page.getByRole("heading", {name:"Plan risk before entry."})).toBeVisible();
  const field = (title:string) => page.locator(".risk-field").filter({hasText:title}).locator("input");
  await field("Capital / equity").fill("10000");
  await field("Risk allocation (%)").fill("1");
  await field("Proposed entry").fill("100");
  await field("Protective stop-loss").fill("98");
  await field("Take-profit").fill("104");
  await field("Value per price point").fill("1");
  await expect(page.locator(".risk-primary-result strong")).toHaveText("50.000000");
  await expect(page.locator(".risk-direction strong")).toContainText("2.00R");
  await page.reload();
  await page.getByRole("button", {name:"Risk Planner"}).click();
  await expect(field("Capital / equity")).toHaveValue("10000");
  await expect(page.locator(".risk-primary-result strong")).toHaveText("50.000000");
  await field("Protective stop-loss").fill("100");
  await expect(page.getByText("Entry and stop-loss must be different prices.")).toBeVisible();
  await page.getByRole("button", {name:"Reset",exact:true}).click();
  await expect(field("Capital / equity")).toHaveValue("");
  await expect(page.getByText("Your analysis will appear here.")).toBeVisible();
});
