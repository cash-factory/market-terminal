import {test,expect} from "@playwright/test";

test("workspace rail separates market navigation from chart-object editing",async({page})=>{
  await page.goto("/market-terminal/");
  const markets=page.getByRole("tab",{name:"Markets"});
  const objects=page.getByRole("tab",{name:/Objects/});
  await expect(markets).toHaveAttribute("aria-selected","true");
  await expect(page.getByRole("button",{name:"Add price level"})).toBeVisible();
  await objects.click();
  await expect(objects).toHaveAttribute("aria-selected","true");
  await expect(page.getByRole("button",{name:"Select all chart drawings"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Add price level"})).toHaveCount(0);
  await markets.click();
  await expect(page.getByRole("button",{name:"Add price level"})).toBeVisible();
});

test("creating a chart object opens its editor without changing the chart layout",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const rect=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!rect)throw new Error("Chart drawing surface unavailable");
  await page.mouse.move(rect.x+rect.width*.3,rect.y+rect.height*.4);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.6,rect.y+rect.height*.6,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await expect(page.getByRole("tab",{name:/Objects/})).toHaveAttribute("aria-selected","true");
  await expect(page.getByRole("button",{name:"Select all chart drawings"})).toBeVisible();
});
