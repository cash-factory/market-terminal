import {expect,test,type Page} from "@playwright/test";

async function draw(page:Page,from:[number,number],to:[number,number]){
  const rect=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!rect)throw new Error("Chart input missing");
  await page.mouse.move(rect.x+rect.width*from[0],rect.y+rect.height*from[1]);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*to[0],rect.y+rect.height*to[1],{steps:11});
  await page.mouse.up();
}
async function save(page:Page){
  await page.getByRole("button",{name:"Apply changes"}).click();
}
test("drawing popup edits color, style, fill and midpoint without changing market data",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Rectangle",exact:true}).click();
  await draw(page,[.27,.34],[.61,.65]);
  await expect(page.locator(".drawing-rectangle")).toHaveCount(1);
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  const dialog=page.getByRole("dialog",{name:/Drawing settings/});
  await expect(dialog).toBeVisible();
  await dialog.getByRole("combobox",{name:"Drawing line weight"}).selectOption("5");
  await dialog.getByRole("combobox",{name:"Drawing line pattern"}).selectOption("dashed");
  await dialog.getByRole("checkbox",{name:/Show midpoint/}).check();
  await dialog.getByRole("slider",{name:"Drawing region fill"}).fill("0.25");
  await save(page);
  await expect(page.locator(".drawing-rectangle-midline")).toHaveCount(1);
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences.drawings[0]).toMatchObject({
    tool:"rectangle",strokeWidth:5,dash:"dashed",showMidline:true,fillOpacity:.25
  });
  await page.reload();
  await expect(page.locator(".drawing-rectangle-midline")).toHaveCount(1);
});

test("coordinate popup moves a drawing accurately and never changes its source",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  await draw(page,[.3,.39],[.57,.6]);
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  const dialog=page.getByRole("dialog",{name:/Drawing settings/});
  await dialog.getByRole("tab",{name:"Coordinates"}).click();
  const input=dialog.getByRole("spinbutton",{name:"end anchor price"});
  const price=Number(await input.inputValue());
  expect(price).toBeGreaterThan(0);
  await input.fill(String(price*1.01));
  await save(page);
  const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences.drawings[0].end.price).toBeCloseTo(price*1.01,8);
  expect(data.preferences.drawings[0].source).toBe("demo");
  await page.getByRole("button",{name:"Undo drawing"}).click();
  const reversed=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(reversed.preferences.drawings[0].end.price).toBeCloseTo(price,8);
});

test("visibility rules persist by timeframe and remain editable from the object tree",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  await draw(page,[.25,.30],[.55,.52]);
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  const dialog=page.getByRole("dialog",{name:/Drawing settings/});
  await dialog.getByRole("tab",{name:"Visibility"}).click();
  await dialog.getByRole("checkbox",{name:"Visible on 1h"}).uncheck();
  await save(page);
  await expect(page.locator(".drawing-shape")).toHaveCount(0);
  await expect(page.locator(".drawing-object-row")).toHaveCount(1);
  await page.getByRole("button",{name:"5m",exact:true}).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
});

test("double-clicking a plotted object opens the same coherent settings dialog",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Rectangle",exact:true}).click();
  await draw(page,[.25,.35],[.59,.62]);
  await page.locator("svg.drawing-overlay .drawing-rectangle").first().dblclick();
  await expect(page.getByRole("dialog",{name:/Drawing settings/})).toBeVisible();
  await page.getByRole("button",{name:"Close drawing settings"}).click();
  await expect(page.getByRole("dialog",{name:/Drawing settings/})).toHaveCount(0);
});
