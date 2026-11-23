import {test,expect} from "@playwright/test";

test("reference market calendars disclose exact provenance without claiming live execution",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await expect(page.locator(".market-session-reference summary")).toContainText("Broker hours not configured");
  await page.locator(".market-session-reference summary").click();
  await expect(page.locator(".market-session-reference")).toContainText("Demonstration display precision");
  await expect(page.locator(".market-session-reference")).toContainText("No executable market-hours assertion");
  await page.getByRole("region",{name:"Saved analyst watchlist"}).locator(".peak-watchlist-open").filter({hasText:"AAPL"}).click();
  await expect(page.locator(".market-session-reference summary")).toContainText("Nasdaq");
  // The <details> remains open when its instrument changes; do not toggle it shut.
  const details=page.locator(".market-session-reference");
  if(!(await details.evaluate(el=>(el as HTMLDetailsElement).open)))
    await details.locator("summary").click();
  await expect(page.getByRole("link",{name:"View official Nasdaq calendar"}))
    .toHaveAttribute("href","https://www.nasdaq.com/holiday-trading-hours");
  await expect(page.locator(".market-session-reference")).toContainText("not a live quote or trading-eligibility confirmation");
  await page.getByRole("region",{name:"Saved analyst watchlist"}).locator(".peak-watchlist-open").filter({hasText:"US100"}).click();
  await expect(page.locator(".market-session-reference summary")).toContainText("Contract hours not configured");
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".market-session-reference summary")).toContainText("Contract hours not configured");
  await expect(page.locator(".chart-grid-cell")).toHaveCount(2);
});
