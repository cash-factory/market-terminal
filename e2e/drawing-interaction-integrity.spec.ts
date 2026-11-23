import {test,expect,type Page} from "@playwright/test";

async function drawTrendline(page:Page,pane=0){
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const overlay=page.locator("svg.drawing-overlay").nth(pane);
  await overlay.scrollIntoViewIfNeeded();
  const box=await overlay.boundingBox();
  if(!box)throw new Error("Missing drawing plot");
  const from={x:box.x+box.width*.3,y:box.y+box.height*.37};
  const to={x:box.x+box.width*.57,y:box.y+box.height*.56};
  await page.mouse.move(from.x,from.y);
  await page.mouse.down();
  await page.mouse.move(to.x,to.y,{steps:10});
  await page.mouse.up();
}

async function savedDrawings(page:Page):Promise<any[]>{
  return page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}").preferences?.drawings??[]);
}

test("dragging a drawing persists an atomic move; undo/redo and reload preserve anchors",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await drawTrendline(page);
  const before=await savedDrawings(page);
  expect(before).toHaveLength(1);
  const hit=page.locator(".drawing-hit").first();
  const box=await hit.boundingBox();
  if(!box)throw new Error("Missing drawing hit target");
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+38,y+17,{steps:12});
  await page.mouse.up();
  await expect.poll(async()=>JSON.stringify(await savedDrawings(page)))
    .not.toBe(JSON.stringify(before));
  const moved=await savedDrawings(page);
  expect(moved[0].start.price).not.toBe(before[0].start.price);
  expect(moved[0].end.price).not.toBe(before[0].end.price);
  await page.getByRole("button",{name:"Undo drawing"}).click();
  await expect.poll(async()=>JSON.stringify(await savedDrawings(page))).toBe(JSON.stringify(before));
  await page.getByRole("button",{name:"Redo drawing"}).click();
  await expect.poll(async()=>JSON.stringify(await savedDrawings(page))).toBe(JSON.stringify(moved));
  await page.reload();
  expect(await savedDrawings(page)).toEqual(moved);
});

test("four chart overlays do not compete on one Delete command; one Undo restores",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await expect(page.locator("svg.drawing-overlay")).toHaveCount(4);
  await drawTrendline(page,2);
  await expect.poll(async()=>(await savedDrawings(page)).length).toBe(1);
  const hit=page.locator(".chart-grid-cell").nth(2).locator(".drawing-hit").first();
  await hit.scrollIntoViewIfNeeded();
  const box=await hit.boundingBox();
  if(!box)throw new Error("Missing chart 3 hit target");
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await expect(page.locator(".chart-grid-cell").nth(2).locator(".drawing-handle")).toHaveCount(2);
  await page.keyboard.press("Delete");
  await expect.poll(async()=>(await savedDrawings(page)).length).toBe(0);
  await page.getByRole("button",{name:"Undo drawing"}).click();
  await expect.poll(async()=>(await savedDrawings(page)).length).toBe(1);
  await expect(page.locator(".chart-grid-cell").nth(2).locator(".drawing-shape")).toHaveCount(1);
});

test("dragging a grouped pair moves both members as one undoable edit",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await drawTrendline(page);
  await drawTrendline(page);
  await expect.poll(async()=>(await savedDrawings(page)).length).toBe(2);
  await page.getByRole("checkbox",{name:"Select drawing 1"}).check();
  await page.getByRole("checkbox",{name:"Select drawing 2"}).check();
  await page.getByRole("button",{name:"Group selected drawings",exact:true}).click();
  const grouped=await savedDrawings(page);
  expect(grouped[0].groupId).toBe(grouped[1].groupId);
  const hit=page.locator(".drawing-hit").first();
  const box=await hit.boundingBox();
  if(!box)throw new Error("Group hit target unavailable");
  const x=box.x+box.width/2,y=box.y+box.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+31,y+14,{steps:10});
  await page.mouse.up();
  await expect.poll(async()=>JSON.stringify(await savedDrawings(page)))
    .not.toBe(JSON.stringify(grouped));
  const moved=await savedDrawings(page);
  expect(moved[0].start.time).not.toBe(grouped[0].start.time);
  expect(moved[1].start.time).not.toBe(grouped[1].start.time);
  await page.getByRole("button",{name:"Undo drawing"}).click();
  await expect.poll(async()=>JSON.stringify(await savedDrawings(page)))
    .toBe(JSON.stringify(grouped));
});
