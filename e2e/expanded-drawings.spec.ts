import {expect,test,type Page} from "@playwright/test";

async function selectTool(page:Page,name:string){
  await page.getByRole("button",{name:"More drawing tools"}).click();
  await page.getByRole("button",{name:new RegExp("^"+name)}).click();
}
async function drag(page:Page,from:[number,number],to:[number,number]){
  const surface=page.locator("svg.drawing-overlay").first();
  const box=await surface.boundingBox();
  if(!box)throw new Error("Missing drawing canvas");
  const a={x:box.x+box.width*from[0],y:box.y+box.height*from[1]};
  const b={x:box.x+box.width*to[0],y:box.y+box.height*to[1]};
  await page.mouse.move(a.x,a.y);
  await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:16});
  await page.mouse.up();
}
test("advanced geometric and position drawing catalog works on real chart canvas",async({page})=>{
  await page.goto("/market-terminal/");
  await selectTool(page,"Arrow");
  await drag(page,[.29,.35],[.59,.58]);
  await expect(page.locator(".drawing-arrow-head")).toHaveCount(1);
  await selectTool(page,"Ellipse");
  await drag(page,[.35,.34],[.65,.65]);
  await expect(page.locator(".drawing-ellipse")).toHaveCount(1);
  await selectTool(page,"Long position");
  await drag(page,[.29,.35],[.60,.68]);
  await expect(page.locator(".drawing-position-risk")).toHaveCount(1);
  await expect(page.locator(".drawing-position-reward")).toHaveCount(1);
  await selectTool(page,"Short position");
  await drag(page,[.33,.66],[.62,.35]);
  await expect(page.locator(".drawing-position-risk")).toHaveCount(2);
  await expect(page.locator(".drawing-position-reward")).toHaveCount(2);
  await expect(page.locator(".drawing-shape")).toHaveCount(4);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(4);
});
test("text annotation and brush are editable, persistent, and isolated from other tools",async({page})=>{
  await page.goto("/market-terminal/");
  await selectTool(page,"Text note");
  const box=await page.locator("svg.drawing-overlay").boundingBox();
  if(!box)throw new Error("Missing canvas");
  await page.mouse.click(box.x+box.width*.32,box.y+box.height*.48);
  await expect(page.locator(".drawing-note-box")).toHaveCount(1);
  await page.getByRole("button",{name:"Edit annotation 1"}).click();
  await page.getByRole("textbox",{name:"Annotation text"}).fill("Liquidity sweep setup");
  await page.getByRole("button",{name:"Save annotation"}).click();
  await expect(page.locator(".drawing-shape").first()).toContainText("Liquidity sweep setup");
  await selectTool(page,"Freehand brush");
  await drag(page,[.26,.28],[.62,.60]);
  await expect(page.locator(".drawing-brush")).toHaveCount(1);
  let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.drawings).toHaveLength(2);
  expect(stored.preferences.drawings[0]).toMatchObject({tool:"text",text:"Liquidity sweep setup"});
  expect(stored.preferences.drawings[1].points.length).toBeGreaterThan(3);
  await page.reload();
  await expect(page.locator(".drawing-note-box")).toHaveCount(1);
  await expect(page.locator(".drawing-brush")).toHaveCount(1);
  await page.getByRole("button",{name:"Duplicate brush 2"}).click();
  await expect(page.locator(".drawing-brush")).toHaveCount(2);
  stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.drawings[2].points[0].time)
    .toBeGreaterThan(stored.preferences.drawings[1].points[0].time);
});
