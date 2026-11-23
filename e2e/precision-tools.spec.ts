import {test,expect,type Page} from "@playwright/test";

async function choose(page:Page,name:string){
  await page.getByRole("button",{name:"More drawing tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  await shelf.getByRole("button",{name,exact:true}).click();
}
async function draw(page:Page,a:[number,number],b?:[number,number]){
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("Plot is unavailable");
  const x=box.x+box.width*a[0],y=box.y+box.height*a[1];
  if(!b){await page.mouse.click(x,y);return;}
  await page.mouse.move(x,y);await page.mouse.down();
  await page.mouse.move(box.x+box.width*b[0],box.y+box.height*b[1],{steps:12});
  await page.mouse.up();
}

test("precision line tools have working mouse anchors, plotting and persisted identity",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"Horizontal ray");
  await draw(page,[.34,.40]);
  await expect(page.locator(".drawing-reference")).toHaveCount(1);
  await choose(page,"Vertical line");
  await draw(page,[.53,.33]);
  await expect(page.locator(".drawing-reference")).toHaveCount(2);
  await choose(page,"Cross line");
  await draw(page,[.45,.52]);
  await expect(page.locator(".drawing-reference")).toHaveCount(3);
  await choose(page,"Extended line");
  await draw(page,[.25,.32],[.55,.65]);
  await expect(page.locator(".drawing-reference")).toHaveCount(4);
  const json=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(json.version).toBe(28);
  expect(json.preferences.drawings.map((drawing:{tool:string})=>drawing.tool))
    .toEqual(["horizontal-ray","vertical-line","cross-line","extended-line"]);
  expect(json.preferences.drawings[0].start).toEqual(json.preferences.drawings[0].end);
  await page.reload();
  await expect(page.locator(".drawing-reference")).toHaveCount(4);
  await expect(page.locator(".drawing-object-row")).toHaveCount(4);
});

test("price/date range tools measure real visible candles and preserve their drawings",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"Price range");
  await draw(page,[.29,.34],[.63,.65]);
  await expect(page.locator(".drawing-price-range")).toHaveCount(1);
  await expect(page.locator(".drawing-shape").first().locator("text")).toContainText("%");
  await choose(page,"Date range");
  await draw(page,[.35,.43],[.68,.56]);
  await expect(page.locator(".drawing-date-band")).toHaveCount(1);
  await expect(page.locator(".drawing-shape").last().locator("text")).toContainText("observed bars");
  await page.reload();
  await expect(page.locator(".drawing-date-band")).toHaveCount(1);
  await expect(page.locator(".drawing-price-range")).toHaveCount(1);
});

test("Tool Library search, pinned favorites and launch persist without an account",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"More drawing tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  const search=shelf.getByRole("searchbox",{name:"Search drawing tools"});
  await search.fill("vertical");
  await expect(shelf.getByRole("button",{name:"Vertical line",exact:true})).toBeVisible();
  await shelf.getByRole("button",{name:"Add Vertical line to favorites"}).click();
  await search.fill("");
  await expect(shelf.getByRole("button",{name:"Use favorite Vertical line"})).toBeVisible();
  await page.getByRole("button",{name:"Close tool library"}).click();
  await page.reload();
  await page.getByRole("button",{name:"More drawing tools"}).click();
  await expect(shelf.getByRole("button",{name:"Use favorite Vertical line"})).toBeVisible();
  await shelf.getByRole("button",{name:"Use favorite Vertical line"}).click();
  await draw(page,[.40,.48]);
  await expect(page.locator(".drawing-reference")).toHaveCount(1);
  const json=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(json.preferences.favoriteDrawingTools).toContain("vertical-line");
});

test("Tool Library remains usable on a narrow mobile viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"More drawing tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(shelf.getByRole("searchbox",{name:"Search drawing tools"})).toBeVisible();
  await shelf.getByRole("button",{name:"Measurement",exact:true}).click();
  await expect(shelf.getByRole("button",{name:"Date range",exact:true})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
