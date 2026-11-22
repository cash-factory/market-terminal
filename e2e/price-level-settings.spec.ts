import {expect,test} from "@playwright/test";
import {mkdirSync} from "node:fs";

test("price-level properties change exact reference, style and timeframe without losing provenance",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("spinbutton",{name:"Level price"}).fill("1.11347");
  await page.getByRole("button",{name:"Add price level"}).click();
  await expect(page.getByRole("button",{name:"Edit price level 1.11347"})).toBeVisible();
  await page.getByRole("button",{name:"Edit price level 1.11347"}).click();
  const dialog=page.getByRole("dialog",{name:"Price level settings"});
  await expect(dialog).toBeVisible();
  await dialog.getByRole("spinbutton",{name:"Reference price"}).fill("1.11555");
  await dialog.getByRole("textbox",{name:"Level label"}).fill("London range high");
  await dialog.getByRole("combobox",{name:"Level line weight"}).selectOption("3");
  await dialog.getByRole("combobox",{name:"Level line style"}).selectOption("1");
  await dialog.getByRole("checkbox",{name:"Show level on 1h"}).uncheck();
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  await expect(page.getByText("Hidden on 1h")).toBeVisible();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.levels[0]).toMatchObject({
    price:1.11555,lineWidth:3,lineStyle:1,title:"London range high",
    visibleOnFrames:expect.not.arrayContaining(["1h"]),source:"demo"
  });
  await page.getByRole("button",{name:"5m",exact:true}).click();
  await expect(page.getByText("Hidden on 1h")).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("London range high")).toBeVisible();
  await page.getByRole("button",{name:"Edit price level 1.11555"}).click();
  await expect(page.getByRole("dialog",{name:"Price level settings"})
    .getByRole("combobox",{name:"Level line weight"})).toHaveValue("3");
});

test("price level settings reject invalid prices and remain usable on mobile",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  const input=page.getByRole("spinbutton",{name:"Level price"});
  await input.fill("1.105");
  await page.getByRole("button",{name:"Add price level"}).click();
  await page.getByRole("button",{name:"Edit price level 1.105"}).click();
  const dialog=page.getByRole("dialog",{name:"Price level settings"});
  await dialog.getByRole("spinbutton",{name:"Reference price"}).fill("-100");
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  await expect(dialog.getByRole("alert")).toContainText("positive finite price");
  await dialog.getByRole("spinbutton",{name:"Reference price"}).fill("1.112");
  const bbox=await dialog.boundingBox();
  if(!bbox)throw new Error("Level settings unavailable");
  expect(bbox.x).toBeGreaterThanOrEqual(-2);
  expect(bbox.x+bbox.width).toBeLessThanOrEqual(392);
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/mobile-price-level-properties.png",animations:"disabled"});
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});
