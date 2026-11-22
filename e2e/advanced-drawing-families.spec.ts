import {test,expect,type Page} from "@playwright/test";

async function choose(page:Page,name:string){
  await page.getByRole("button",{name:"More drawing tools"}).click();
  await page.getByRole("group",{name:"Advanced drawing tools"})
    .getByRole("button",{name,exact:true}).click();
}
async function canvas(page:Page){
  const rect=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!rect)throw new Error("Drawing overlay absent");
  return rect;
}
async function click(page:Page,x:number,y:number){
  const b=await canvas(page);
  await page.mouse.click(b.x+b.width*x,b.y+b.height*y);
}
async function baseline(page:Page,from:[number,number],to:[number,number]){
  const b=await canvas(page);
  await page.mouse.move(b.x+b.width*from[0],b.y+b.height*from[1]);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width*to[0],b.y+b.height*to[1],{steps:12});
  await page.mouse.up();
}
test("pitchfork, triangle and Fibonacci extension use three actual price/time anchors",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"Median pitchfork");
  await baseline(page,[.25,.65],[.50,.35]);
  await expect(page.locator(".drawing-pitchfork")).toBeVisible();
  await click(page,.60,.72);
  await expect(page.locator(".drawing-pitchfork")).toHaveCount(1);
  await choose(page,"Triangle");
  await baseline(page,[.25,.3],[.6,.4]);
  await click(page,.48,.72);
  await expect(page.locator(".drawing-triangle")).toHaveCount(1);
  await choose(page,"Trend-based fib extension");
  await baseline(page,[.26,.63],[.45,.3]);
  await click(page,.64,.55);
  await expect(page.locator(".drawing-fib-extension")).toHaveCount(1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.drawings.map((d:{tool:string})=>d.tool)).toEqual([
    "pitchfork","triangle","fib-extension"
  ]);
  expect(stored.preferences.drawings.every((d:{points:unknown[]})=>d.points?.length===3)).toBe(true);
  await page.reload();
  await expect(page.locator(".drawing-pitchfork")).toHaveCount(1);
  await expect(page.locator(".drawing-fib-extension")).toHaveCount(1);
});

test("four-to-six pivot patterns preserve exact sequence, vertex handles and storage",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"ABCD pattern");
  await baseline(page,[.22,.65],[.42,.38]);
  await expect(page.locator(".drawing-anchor-progress")).toContainText("ANCHOR 3 / 4");
  await click(page,.58,.58);
  await expect(page.locator(".drawing-anchor-progress")).toContainText("ANCHOR 4 / 4");
  await click(page,.76,.29);
  await expect(page.locator(".drawing-anchor-progress")).toHaveCount(0);
  await expect(page.locator(".drawing-pattern-path")).toHaveCount(1);
  let data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences.drawings[0].tool).toBe("pattern-abcd");
  expect(data.preferences.drawings[0].points).toHaveLength(4);
  await page.getByRole("checkbox",{name:"Select drawing 1"}).check();
  await expect(page.locator(".pattern-vertex-handle")).toHaveCount(2);
  await choose(page,"Elliott impulse 0–5");
  await baseline(page,[.20,.67],[.33,.37]);
  await click(page,.44,.53);await click(page,.55,.29);
  await click(page,.66,.42);await click(page,.76,.21);
  await expect(page.locator(".drawing-pattern-path")).toHaveCount(2);
  data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(data.preferences.drawings[1].points).toHaveLength(6);
  await page.reload();
  await expect(page.locator(".drawing-pattern-path")).toHaveCount(2);
});

test("time-zone, circle and Gann studies use chart geometry rather than fake price data",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"Fib time zones");
  await baseline(page,[.25,.43],[.33,.54]);
  await expect(page.locator(".drawing-fib-timezone line")).not.toHaveCount(0);
  await choose(page,"Fibonacci circles");
  await baseline(page,[.39,.45],[.52,.60]);
  await expect(page.locator(".drawing-fib-circles ellipse")).not.toHaveCount(0);
  await choose(page,"Gann box");
  await baseline(page,[.22,.25],[.62,.72]);
  await expect(page.locator(".drawing-gann-box")).toHaveCount(1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.drawings.map((d:{tool:string})=>d.tool)).toEqual([
    "fib-timezone","fib-circles","gann-box"
  ]);
});

test("callout and price-note annotations open editable tool-specific property settings",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"Callout");
  await click(page,.42,.46);
  await expect(page.locator(".drawing-callout")).toHaveCount(1);
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  await page.getByRole("textbox",{name:"Drawing annotation text"}).fill("Evidence against this scenario");
  await page.getByRole("button",{name:"Apply changes"}).click();
  await expect(page.locator(".drawing-callout")).toContainText("Evidence against this scenario");
  await choose(page,"Price note");
  await click(page,.65,.62);
  await expect(page.locator(".drawing-price-note")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".drawing-callout")).toContainText("Evidence against this scenario");
  await expect(page.locator(".drawing-price-note")).toHaveCount(1);
});
