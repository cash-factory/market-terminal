import {expect,test,type Page} from "@playwright/test";
import {mkdirSync} from "node:fs";
async function draw(page:Page,from:[number,number],to:[number,number]){
  const chart=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!chart)throw new Error("Chart overlay was not mounted");
  await page.mouse.move(chart.x+chart.width*from[0],chart.y+chart.height*from[1]);
  await page.mouse.down();
  await page.mouse.move(chart.x+chart.width*to[0],chart.y+chart.height*to[1],{steps:16});
  await page.mouse.up();
}
async function select(page:Page,name:string){
  await page.getByRole("button",{name:"More drawing tools"}).click();
  await page.getByRole("group",{name:"Advanced drawing tools"})
    .getByRole("button",{name,exact:true}).click();
}
async function shot(page:Page,name:string){
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/"+name+".png",animations:"disabled"});
}
test("purposeful categories, subfamilies and visual guides replace arbitrary numerical tool rows",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Open Trend & channels tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(shelf).toBeVisible();
  const subgroup=shelf.getByRole("button",{name:"Toggle Channels & pitchforks subgroup"});
  await expect(subgroup).toHaveAttribute("aria-expanded","true");
  const regression=shelf.getByRole("button",{name:"Regression channel",exact:true});
  await regression.hover();
  await expect(shelf.getByText("Fit only observed closes inside your chosen period",{exact:false})).toBeVisible();
  await expect(regression.locator("svg")).toHaveCount(1);
  await shot(page,"refined-layered-tool-workbench-desktop");
  await subgroup.click();
  await expect(subgroup).toHaveAttribute("aria-expanded","false");
  await expect(regression).toHaveCount(0);
  await subgroup.click();
  await expect(regression).toBeVisible();
  await shelf.getByRole("button",{name:"Add Regression channel to favorites"}).click();
  await expect(shelf.getByRole("button",{name:"Remove Regression channel from favorites"})).toBeVisible();
});

test("regression channel fits observed candles, with independent deviation and center-line control",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await select(page,"Regression channel");
  await draw(page,[.22,.44],[.69,.66]);
  await expect(page.locator(".drawing-regression-channel")).toHaveCount(1);
  await expect(page.locator(".drawing-regression-upper")).toHaveCount(1);
  await expect(page.locator(".drawing-regression-center")).toHaveCount(1);
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  const dialog=page.getByRole("dialog",{name:/Drawing settings/});
  await dialog.getByRole("slider",{name:"Regression deviation multiplier"}).fill("3");
  await dialog.getByRole("checkbox",{name:"Central fit line"}).uncheck();
  await shot(page,"regression-channel-standalone-properties");
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  await expect(page.locator(".drawing-regression-center")).toHaveCount(0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.drawings[0]).toMatchObject({
    tool:"regression-channel",regressionDeviation:3,showMidline:false,source:"demo"
  });
  await page.reload();
  await expect(page.locator(".drawing-regression-upper")).toHaveCount(1);
  await expect(page.locator(".drawing-regression-center")).toHaveCount(0);
});

test("trend angle labels scale-dependent screen geometry and supports an independent baseline",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await select(page,"Trend angle");
  await draw(page,[.30,.68],[.61,.36]);
  await expect(page.locator(".drawing-trend-angle")).toHaveCount(1);
  await expect(page.locator(".drawing-trend-angle")).toContainText("visual");
  await expect(page.locator(".drawing-angle-baseline")).toHaveCount(1);
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  const dialog=page.getByRole("dialog",{name:/Drawing settings/});
  await dialog.getByRole("checkbox",{name:"Horizontal angle guide"}).uncheck();
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  await expect(page.locator(".drawing-angle-baseline")).toHaveCount(0);
});

test("translucent highlighter is traced and saved as actual points",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await select(page,"Highlighter");
  await draw(page,[.20,.37],[.64,.40]);
  await expect(page.locator(".drawing-highlighter")).toHaveCount(1);
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(state.preferences.drawings[0].tool).toBe("highlighter");
  expect(state.preferences.drawings[0].opacity).toBe(.36);
  expect(state.preferences.drawings[0].points.length).toBeGreaterThan(2);
  await page.reload();
  await expect(page.locator(".drawing-highlighter")).toHaveCount(1);
});

test("mobile layered families, subgroup controls and guide stay within the phone viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Open Trend & channels tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(shelf.getByRole("button",{name:"Regression channel",exact:true})).toBeVisible();
  const bounds=await shelf.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-2);
  expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(392);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await shot(page,"refined-layered-tool-workbench-mobile");
});

test("Fibonacci time guides and cycle repeats have standalone editable calculations",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await select(page,"Fib time zones");
  await draw(page,[.22,.43],[.31,.58]);
  await expect(page.locator(".drawing-fib-timezone")).toHaveCount(1);
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  const dialog=page.getByRole("dialog",{name:/Drawing settings/});
  await dialog.getByRole("button",{name:"Remove time guide 8"}).click();
  await dialog.getByRole("spinbutton",{name:"New time guide level"}).fill("55");
  await dialog.getByRole("button",{name:"Add time guide"}).click();
  await dialog.getByRole("button",{name:"Apply changes"}).click();
  let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.drawings[0].timeLevels).toContain(55);
  expect(stored.preferences.drawings[0].timeLevels).not.toContain(8);
  await select(page,"Cyclic lines");
  await draw(page,[.25,.3],[.33,.64]);
  await page.getByRole("button",{name:"Settings for drawing 2"}).click();
  const cycleDialog=page.getByRole("dialog",{name:/Drawing settings/});
  await cycleDialog.getByRole("combobox",{name:"Cycle marker count"}).selectOption("4");
  await cycleDialog.getByRole("button",{name:"Apply changes"}).click();
  stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.drawings[1]).toMatchObject({tool:"cyclic-lines",cycleCount:4});
  await page.reload();
  await expect(page.locator(".drawing-cyclic-lines line")).not.toHaveCount(0);
});
