import {test,expect,type Page} from "@playwright/test";

async function drawLine(page:Page,from:[number,number],to:[number,number]){
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("Missing chart");
  const a={x:box.x+box.width*from[0],y:box.y+box.height*from[1]};
  const b={x:box.x+box.width*to[0],y:box.y+box.height*to[1]};
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();
}

test("select, group, style and layer drawings; save and restore the editor state",async({page})=>{
  await page.goto("/market-terminal/");
  await drawLine(page,[.24,.31],[.44,.40]);
  await drawLine(page,[.57,.53],[.76,.64]);
  await drawLine(page,[.26,.67],[.45,.79]);
  await expect(page.locator(".drawing-shape")).toHaveCount(3);
  await page.getByRole("checkbox",{name:"Select drawing 1"}).check();
  await page.getByRole("checkbox",{name:"Select drawing 2"}).check();
  await page.getByRole("button",{name:"Group selected drawings"}).click();
  await page.getByRole("combobox",{name:"Selected drawing weight"}).selectOption("4");
  await page.getByRole("combobox",{name:"Selected drawing line style"}).selectOption("dashed");
  await page.getByRole("button",{name:"Bring selected drawings forward"}).click();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.drawings.map((d:{id:string;strokeWidth?:number})=>d.strokeWidth??0))
    .toEqual([0,4,4]);
  const grouped=saved.preferences.drawings.filter((d:{groupId?:string})=>d.groupId);
  expect(grouped).toHaveLength(2);
  expect(grouped[0].groupId).toBe(grouped[1].groupId);
  expect(grouped.every((d:{dash?:string})=>d.dash==="dashed")).toBe(true);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(3);
  await page.getByRole("checkbox",{name:"Select drawing 2"}).check();
  await page.getByRole("checkbox",{name:"Select drawing 3"}).check();
  await page.getByRole("button",{name:"Ungroup selected drawings"}).click();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.drawings.every((d:{groupId?:string})=>!d.groupId)).toBe(true);
  await page.getByRole("button",{name:"Undo drawing"}).click();
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.drawings.filter((d:{groupId?:string})=>d.groupId)).toHaveLength(2);
});

test("Shift-select in the chart and keyboard Delete remove selected editable shapes",async({page})=>{
  await page.goto("/market-terminal/");
  await drawLine(page,[.24,.32],[.43,.41]);
  await drawLine(page,[.55,.54],[.76,.63]);
  const hitBoxes=await Promise.all(
    [0,1].map(async i=>page.locator(".drawing-hit").nth(i).boundingBox()));
  if(!hitBoxes[0]||!hitBoxes[1])throw new Error("Missing line targets");
  const a=hitBoxes[0],b=hitBoxes[1];
  await page.mouse.click(a.x+a.width/2,a.y+a.height/2);
  await page.keyboard.down("Shift");
  await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
  await page.keyboard.up("Shift");
  await expect(page.getByRole("checkbox",{name:"Select drawing 1"})).toBeChecked();
  await expect(page.getByRole("checkbox",{name:"Select drawing 2"})).toBeChecked();
  await page.keyboard.press("Delete");
  await expect(page.locator(".drawing-shape")).toHaveCount(0);
});
