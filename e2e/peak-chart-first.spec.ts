import {expect,test} from "@playwright/test";

test("desktop layout keeps the chart as the primary surface",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/market-terminal/");
  const chart=page.locator(".chart-surface").first();
  const rail=page.locator(".primary-sidebar");
  const inspector=page.locator(".right-panel");
  await expect(chart).toBeVisible();
  await expect(rail).toBeVisible();
  await expect(inspector).toBeVisible();
  const chartBounds=await chart.boundingBox();
  const railBounds=await rail.boundingBox();
  const panelBounds=await inspector.boundingBox();
  expect(chartBounds && railBounds && panelBounds).toBeTruthy();
  expect(chartBounds!.width).toBeGreaterThan(650);
  expect(chartBounds!.height).toBeGreaterThan(430);
  expect(railBounds!.x+railBounds!.width).toBeLessThan(chartBounds!.x+2);
  expect(chartBounds!.x+chartBounds!.width).toBeLessThanOrEqual(panelBounds!.x+4);
  // A horizontal navigation dock should not appear beneath the chart.
  expect(railBounds!.width).toBeLessThan(70);
});

test("quick market tabs switch chart symbols without losing analysis tools",async({page})=>{
  await page.goto("/market-terminal/");
  const tabs=page.getByRole("navigation",{name:"Quick chart markets"});
  await expect(tabs).toBeVisible();
  await tabs.getByRole("button",{name:/BTC/}).click();
  await expect(page.locator(".instrument-header")).toContainText("BTC");
  await expect(page.locator("svg.drawing-overlay").first()).toBeVisible();
  await tabs.getByRole("button",{name:/EUR/}).click();
  await expect(page.locator(".instrument-header")).toContainText("EUR");
  await expect(page.getByRole("group",{name:"Chart drawing categories"})).toBeVisible();
});

test("drawing library remains bounded alongside price action",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Open Trend & channels tools"}).click();
  const library=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(library).toBeVisible();
  const box=await library.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThan(450);
  expect(box!.x+box!.width).toBeLessThan(600);
  await page.getByRole("button",{name:"Close tool library"}).click();
  await expect(page.locator(".chart-surface").first()).toBeVisible();
});

test("replay keeps the chart above study parameters",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Start replay"}).click();
  const chart=await page.locator(".chart-surface").first().boundingBox();
  const lab=await page.getByRole("region",{name:"Structured replay simulation"}).boundingBox();
  expect(chart && lab).toBeTruthy();
  expect(chart!.y).toBeLessThan(lab!.y);
  await expect(page.getByRole("slider",{name:"Replay position"})).toBeAttached();
});
