import {test,expect,type Page} from "@playwright/test";
import {TOOL_DEFINITIONS,TOOL_GROUPS,ONE_ANCHOR_TOOLS,type ToolDefinition} from "../src/drawing/toolDefinitions";
import {requiresMultiPoint,multiPointCount} from "../src/drawing/multiAnchor";

async function place(page:Page,definition:ToolDefinition){
 const box=await page.locator("svg.drawing-overlay").first().boundingBox();
 if(!box)throw new Error("Chart drawing overlay not mounted");
 const click=(x:number,y:number)=>page.mouse.click(box.x+box.width*x,box.y+box.height*y);
 if(ONE_ANCHOR_TOOLS.has(definition.id)){await click(.36,.48);return;}
 const from=definition.id==="short-position"?[.28,.67]:[.28,.37];
 const to=definition.id==="short-position"?[.59,.36]:[.59,.66];
 await page.mouse.move(box.x+box.width*from[0],box.y+box.height*from[1]);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*to[0],box.y+box.height*to[1],{steps:12});
 await page.mouse.up();
 if(definition.id==="channel")await click(.68,.44);
 if(requiresMultiPoint(definition.id)){
   const points:[[number,number],[number,number],[number,number],[number,number]]=[
     [.65,.42],[.71,.53],[.77,.33],[.81,.62]
   ];
   for(let i=0;i<multiPointCount(definition.id)-2;i++)await click(...points[i]);
 }
}
async function stored(page:Page){
 return page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
}
for(const family of TOOL_GROUPS){
 const tools=TOOL_DEFINITIONS.filter(t=>t.group===family);
 test(family+": each implemented tool places, persists, and supports undo/redo",async({page})=>{
   test.setTimeout(120_000);
   await page.goto("/market-terminal/?classic");
   for(const [index,definition] of tools.entries()){
     await page.getByRole("button",{name:"More drawing tools"}).click();
     const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
     await shelf.getByRole("searchbox",{name:"Search drawing tools"}).fill(definition.label);
     await shelf.getByRole("button",{name:definition.label,exact:true}).click();
     await place(page,definition);
     await expect.poll(async()=>((await stored(page)).preferences?.drawings??[]).length,
       {message:"Drawing not saved: "+definition.label}).toBe(index+1);
     const state=await stored(page);
     expect(state.preferences.drawings[index].tool,definition.label).toBe(definition.id);
     expect(state.preferences.drawings[index].source).toBe("demo");
     expect(state.preferences.drawings[index].symbol).toBe("EURUSD");
   }
   await page.keyboard.press("Control+z");
   await expect.poll(async()=>((await stored(page)).preferences?.drawings??[]).length)
     .toBe(tools.length-1);
   await page.keyboard.press("Control+Shift+z");
   await expect.poll(async()=>((await stored(page)).preferences?.drawings??[]).length)
     .toBe(tools.length);
   await page.reload();
   await expect(page.locator(".drawing-object-row")).toHaveCount(tools.length);
   const state=await stored(page);
   expect(state.preferences.drawings.map((d:{tool:string})=>d.tool))
     .toEqual(tools.map(tool=>tool.id));
 });
}
