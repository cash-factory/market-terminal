import { test, expect } from "@playwright/test";

test("technical studies render and persist while drawings remain operable",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  for(const name of ["EMA 20","Bollinger Bands 20","RSI 14","MACD 12/26/9","ATR 14"]){
    await page.getByRole("checkbox",{name}).check();
  }
  await expect(page.locator(".indicator-pane")).toHaveCount(3);
  await expect(page.getByRole("checkbox",{name:"EMA 20"})).toBeChecked();
  await page.getByRole("button",{name:"Close indicator menu"}).click();
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const box=await page.locator("svg.drawing-overlay").boundingBox();
  if(!box)throw new Error("Chart drawing surface missing.");
  await page.mouse.click(box.x+box.width*.31,box.y+box.height*.37);
  await page.mouse.click(box.x+box.width*.61,box.y+box.height*.64);
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.getByRole("button",{name:"5m",exact:true}).click();
  await expect(page.locator(".indicator-pane")).toHaveCount(3);
  await page.reload();
  await expect(page.locator(".indicator-pane")).toHaveCount(3);
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await expect(page.getByRole("checkbox",{name:"RSI 14"})).toBeChecked();
  await expect(page.getByRole("checkbox",{name:"ATR 14"})).toBeChecked();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.studies).toMatchObject({
    ema20:true,bollinger20:true,rsi14:true,macd:true,atr14:true
  });
  expect(saved.preferences.drawings).toHaveLength(1);
});

test("technical studies can be disabled without affecting the chart",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await page.getByRole("checkbox",{name:"RSI 14"}).check();
  await expect(page.locator(".indicator-pane")).toHaveCount(1);
  await page.getByRole("button",{name:"Clear all"}).click();
  await expect(page.locator(".indicator-pane")).toHaveCount(0);
  await expect(page.locator(".chart-canvas canvas").first()).toBeVisible();
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
});
