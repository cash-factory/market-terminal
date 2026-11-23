import {test,expect,type Page} from "@playwright/test";

async function saved(page:Page):Promise<any>{
  return page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}").preferences?.drawings?.[0]);
}
async function moveHandle(page:Page,selector:string,dx:number,dy:number){
  const target=page.locator(selector).first();
  await expect(target).toBeVisible();
  const rect=await target.boundingBox();
  if(!rect)throw new Error("Handle is not measurable: "+selector);
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+dx,y+dy,{steps:12});
  await page.mouse.up();
}
async function choose(page:Page,label:string){
  await page.getByRole("button",{name:"More drawing tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  await shelf.getByRole("searchbox",{name:"Search drawing tools"}).fill(label);
  await shelf.getByRole("button",{name:label,exact:true}).click();
}

test("position target drag edits only the target and supports undo/reload",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"Long position");
  const box=await page.locator("svg.drawing-overlay").boundingBox();
  if(!box)throw new Error("Missing chart");
  const a={x:box.x+box.width*.27,y:box.y+box.height*.42};
  const b={x:box.x+box.width*.55,y:box.y+box.height*.58};
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();
  await expect.poll(async()=>!!(await saved(page))).toBe(true);
  const before=await saved(page);
  await page.getByRole("checkbox",{name:"Select drawing 1"}).check();
  await moveHandle(page,".position-target-handle",0,-22);
  await expect.poll(async()=>JSON.stringify((await saved(page)).target)).not.toBe(JSON.stringify(before.target));
  const edited=await saved(page);
  expect(edited.start).toEqual(before.start);
  expect(edited.end).toEqual(before.end);
  expect(edited.target.price).toBeGreaterThan(before.target.price);
  await page.getByRole("button",{name:"Undo drawing"}).click();
  await expect.poll(async()=>JSON.stringify(await saved(page))).toBe(JSON.stringify(before));
  await page.getByRole("button",{name:"Redo drawing"}).click();
  await expect.poll(async()=>JSON.stringify(await saved(page))).toBe(JSON.stringify(edited));
  await page.reload();
  expect(await saved(page)).toEqual(edited);
});

test("multi-anchor vertex drag moves one pivot, preserves other pivots and undo",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await choose(page,"ABCD pattern");
  const box=await page.locator("svg.drawing-overlay").boundingBox();
  if(!box)throw new Error("Missing chart");
  const point=(x:number,y:number)=>({x:box.x+box.width*x,y:box.y+box.height*y});
  const a=point(.25,.60),b=point(.43,.36);
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:10});await page.mouse.up();
  const c=point(.57,.53),d=point(.73,.28);
  await page.mouse.click(c.x,c.y);
  await page.mouse.click(d.x,d.y);
  await expect.poll(async()=>!!(await saved(page))).toBe(true);
  const before=await saved(page);
  expect(before.points).toHaveLength(4);
  await page.getByRole("checkbox",{name:"Select drawing 1"}).check();
  await moveHandle(page,".pattern-vertex-handle",22,16);
  await expect.poll(async()=>JSON.stringify((await saved(page)).points[2]))
    .not.toBe(JSON.stringify(before.points[2]));
  const changed=await saved(page);
  expect(changed.points[0]).toEqual(before.points[0]);
  expect(changed.points[1]).toEqual(before.points[1]);
  expect(changed.points[3]).toEqual(before.points[3]);
  expect(changed.start).toEqual(before.start);
  expect(changed.end).toEqual(before.end);
  await page.getByRole("button",{name:"Undo drawing"}).click();
  await expect.poll(async()=>JSON.stringify(await saved(page))).toBe(JSON.stringify(before));
});
