import {expect,test,type Page} from "@playwright/test";
import {TOOL_BY_ID,ONE_ANCHOR_TOOLS} from "../src/drawing/toolDefinitions";
import {requiresMultiPoint,multiPointCount} from "../src/drawing/multiAnchor";
import type {DrawingTool} from "../src/drawing/types";

type XY=[number,number];
async function place(page:Page,tool:DrawingTool){
  const definition=TOOL_BY_ID.get(tool);
  if(!definition)throw new Error("Missing definition "+tool);
  await page.getByRole("button",{name:"More drawing tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  await shelf.getByRole("searchbox",{name:"Search drawing tools"}).fill(definition.label);
  await shelf.getByRole("button",{name:definition.label,exact:true}).click();
  const svg=page.locator("svg.drawing-overlay").first();
  const box=await svg.boundingBox();
  if(!box)throw new Error("Missing chart overlay");
  const pos=([x,y]:XY)=>({x:box.x+x*box.width,y:box.y+y*box.height});
  const click=async(p:XY)=>{const a=pos(p);await page.mouse.click(a.x,a.y);};
  if(ONE_ANCHOR_TOOLS.has(tool)){await click([.38,.42]);return;}
  const from=pos([.28,tool==="short-position"?.67:.37]);
  const to=pos([.59,tool==="short-position"?.36:.66]);
  await page.mouse.move(from.x,from.y);
  await page.mouse.down();
  await page.mouse.move(to.x,to.y,{steps:10});
  await page.mouse.up();
  if(tool==="channel")await click([.65,.43]);
  if(requiresMultiPoint(tool)){
    const extra:XY[]=[[.65,.42],[.71,.53],[.77,.33],[.81,.62]];
    for(let i=0;i<multiPointCount(tool)-2;i++)await click(extra[i]);
  }
}
async function firstDrawing(page:Page):Promise<any>{
  return page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}").preferences?.drawings?.[0]);
}

const tools:DrawingTool[]=[
  "trendline","channel","fibonacci","fib-circles","gann-box",
  "pitchfork","pattern-xabcd","long-position","price-note","regression-channel"
];
for(const tool of tools){
  test(tool+": selected handle edit, undo and reload retain canonical anchors",async({page})=>{
    test.setTimeout(90_000);
    await page.goto("/market-terminal/?classic");
    await place(page,tool);
    await expect.poll(async()=>!!(await firstDrawing(page))).toBe(true);
    const before=await firstDrawing(page);
    expect(before.tool).toBe(tool);
    await page.getByRole("checkbox",{name:"Select drawing 1"}).check();
    const handle=page.locator(".drawing-handle").first();
    await expect(handle).toBeVisible();
    const box=await handle.boundingBox();
    if(!box)throw new Error("Missing edit handle");
    const x=box.x+box.width/2,y=box.y+box.height/2;
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x+21,y+12,{steps:10});
    await page.mouse.up();
    await expect.poll(async()=>(await firstDrawing(page)).start.time).not.toBe(before.start.time);
    const edited=await firstDrawing(page);
    expect(edited.id).toBe(before.id);
    expect(edited.symbol).toBe(before.symbol);
    expect(edited.source).toBe(before.source);
    if(edited.points){
      expect(edited.points[0]).toEqual(edited.start);
      expect(edited.points[1]).toEqual(edited.end);
    }
    await page.getByRole("button",{name:"Undo drawing"}).click();
    await expect.poll(async()=>JSON.stringify(await firstDrawing(page)))
      .toBe(JSON.stringify(before));
    await page.getByRole("button",{name:"Redo drawing"}).click();
    await expect.poll(async()=>JSON.stringify(await firstDrawing(page)))
      .toBe(JSON.stringify(edited));
    await page.reload();
    expect(await firstDrawing(page)).toEqual(edited);
  });
}
