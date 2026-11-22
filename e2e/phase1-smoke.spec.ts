import {expect,test} from "@playwright/test";

test("real drawing input and chart persistence across desktop and touch engines",async({page,isMobile})=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/market-terminal/");
  const overlay=page.locator("svg.drawing-overlay").first();
  await expect(overlay).toBeVisible();
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  await overlay.scrollIntoViewIfNeeded();
  const box=await overlay.boundingBox();
  if(!box)throw new Error("Drawing overlay unavailable");
  const a={x:box.x+box.width*.31,y:box.y+box.height*.38};
  const b={x:box.x+box.width*.61,y:box.y+box.height*.61};
  if(isMobile){
    await page.touchscreen.tap(a.x,a.y);
    await expect(page.locator(".drawing-shape"),"First tap should show anchor preview").toHaveCount(1);
    await page.touchscreen.tap(b.x,b.y);
  }else{
    await page.mouse.move(a.x,a.y);
    await page.mouse.down();
    await page.mouse.move(b.x,b.y,{steps:12});
    await page.mouse.up();
  }
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("responsive chart controls, saved profiles and linked layout remain accessible",async({page,isMobile})=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle dual-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(2);
  await page.getByRole("combobox",{name:"Chart 2 timeframe"}).selectOption("5m");
  await page.getByRole("button",{name:"Chart workspace profiles"}).click();
  await page.getByRole("textbox",{name:"Chart profile name"}).fill("Cross-browser desk");
  await page.getByRole("button",{name:"Save chart profile"}).click();
  await expect(page.getByRole("button",{name:"Apply chart profile Cross-browser desk"})).toBeVisible();
  await page.getByRole("button",{name:"Close chart profiles"}).click();
  await page.reload();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(2);
  await expect(page.getByRole("combobox",{name:"Chart 2 timeframe"})).toHaveValue("5m");
  if(isMobile){
    const size=await page.evaluate(()=>({
      viewport:window.innerWidth,width:document.documentElement.scrollWidth
    }));
    expect(size.width).toBeLessThanOrEqual(size.viewport+4);
  }
  expect(errors).toEqual([]);
});

test("study selection and chart visualization changes render with correct accessible labels",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("combobox",{name:"Chart display style"}).selectOption("area");
  console.log("Chart style selected");
  await page.getByRole("button",{name:"Technical indicators"}).click({timeout:10000});
  console.log("Indicator menu open");
  const checkbox=page.getByRole("checkbox",{name:"RSI 14"});
  await checkbox.check({timeout:10000});
  console.log("RSI enabled");
  await expect(page.locator(".indicator-pane")).toHaveCount(1);
  await page.getByRole("button",{name:"Close indicator menu"}).click();
  await page.reload();
  await expect(page.getByRole("combobox",{name:"Chart display style"})).toHaveValue("area");
  await expect(page.locator(".indicator-pane")).toHaveCount(1);
});
