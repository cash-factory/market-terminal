import {expect,test} from "@playwright/test";
import {mkdirSync} from "node:fs";

const root="test-results/review";
const capture=async (page:import("@playwright/test").Page,name:string)=>{
  mkdirSync(root,{recursive:true});
  await page.screenshot({path:root+"/"+name+".png",animations:"disabled"});
};
const insideViewport=async (page:import("@playwright/test").Page,selector:string)=>{
  const box=await page.locator(selector).boundingBox();
  if(!box)throw new Error("Review surface is missing: "+selector);
  const width=page.viewportSize()?.width??0,height=page.viewportSize()?.height??0;
  expect(box.x).toBeGreaterThanOrEqual(-2);
  expect(box.y).toBeGreaterThanOrEqual(-2);
  expect(box.x+box.width).toBeLessThanOrEqual(width+2);
  expect(box.y+box.height).toBeLessThanOrEqual(height+2);
};

test("desktop drawing library fits a short laptop viewport and exposes all tools",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"More drawing tools"}).click();
  const shelf=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(shelf.getByRole("searchbox",{name:"Search drawing tools"})).toBeFocused();
  await insideViewport(page,".tool-shelf");
  await capture(page,"desktop-tool-library");
  await shelf.getByRole("searchbox",{name:"Search drawing tools"}).fill("price range");
  await expect(shelf.getByRole("button",{name:"Price range",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Close tool library"}).click();
  const raw=await page.locator(".instrument-quote strong").textContent();
  const quote=Number((raw??"").replace(/,/g,""));
  expect(quote).toBeGreaterThan(0);
  const level=page.getByRole("spinbutton",{name:"Level price"});
  await level.fill((quote*1.035).toFixed(5));
  await page.getByRole("button",{name:"Add price level"}).click();
  await level.fill((quote*.965).toFixed(5));
  await page.getByRole("button",{name:"Add price level"}).click();
  await page.getByRole("tab",{name:"Context"}).click();
  await expect(page.getByRole("tabpanel",{name:"Chart Context Lens"})).toBeVisible();
  await capture(page,"desktop-chart-context");
});

test("mobile drawing library and context panel remain within viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"More drawing tools"}).click();
  await expect(page.getByRole("group",{name:"Advanced drawing tools"})).toBeVisible();
  await insideViewport(page,".tool-shelf");
  await capture(page,"mobile-tool-library");
  await page.getByRole("button",{name:"Close tool library"}).click();
  await page.getByRole("tab",{name:"Context"}).click();
  await expect(page.getByRole("tabpanel",{name:"Chart Context Lens"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(2);
  await capture(page,"mobile-chart-context");
});
