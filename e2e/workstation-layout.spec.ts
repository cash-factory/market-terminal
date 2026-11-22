import {test,expect} from "@playwright/test";

test("market setup and drawing tools have separate workstation control bands",async({page})=>{
  await page.goto("/market-terminal/");
  const market=page.getByRole("group",{name:"Market and chart setup"});
  const drawings=page.getByRole("group",{name:"Drawing and editing tools"});
  await expect(market).toBeVisible();
  await expect(drawings).toBeVisible();
  await expect(market.getByRole("button",{name:"Start replay"})).toBeVisible();
  await expect(drawings.getByRole("button",{name:"Trendline"})).toBeVisible();
  const first=await market.boundingBox();
  const second=await drawings.boundingBox();
  expect(first&&second).toBeTruthy();
  expect(second!.y).toBeGreaterThanOrEqual(first!.y+first!.height-2);
  await drawings.getByRole("button",{name:"Trendline"}).click();
  await expect(drawings.getByRole("button",{name:"Trendline"})).toHaveClass(/active/);
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
});

test("responsive workstation does not overflow viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await expect(page.getByRole("group",{name:"Drawing and editing tools"})).toBeVisible();
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
