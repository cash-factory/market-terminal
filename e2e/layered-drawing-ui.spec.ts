import {expect,test} from "@playwright/test";
import {mkdirSync} from "node:fs";

const dir="test-results/review";
async function shot(page:import("@playwright/test").Page,name:string){
  mkdirSync(dir,{recursive:true});
  await page.screenshot({path:dir+"/"+name+".png",animations:"disabled"});
}
test("Studio tool families open a layered, category-scoped library",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/market-terminal/");
  const rail=page.getByRole("group",{name:"Chart drawing categories"});
  await expect(rail).toBeVisible();
  const group=rail.getByRole("button",{name:"Open Patterns & cycles tools"});
  await group.click();
  await expect(group).toHaveAttribute("aria-expanded","true");
  const library=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(library.getByRole("button",{name:"ABCD pattern",exact:true})).toBeVisible();
  await expect(library.getByRole("button",{name:"Fibonacci retracement",exact:true})).toHaveCount(0);
  await expect(library.getByText("Additional tools researched for this family")).toBeVisible();
  await shot(page,"studio-pattern-tool-library");
  await library.getByRole("button",{name:"ABCD pattern",exact:true}).click();
  await expect(group).toHaveClass(/armed/);
  await expect(page.getByRole("status").filter({hasText:"more for ABCD pattern"})).toBeVisible();
  await rail.getByRole("button",{name:"Open Fib / Gann tools"}).click();
  await expect(library.getByRole("button",{name:"Trend-based fib extension",exact:true})).toBeVisible();
  await expect(library.getByRole("button",{name:"ABCD pattern",exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Close tool library"}).click();
  await expect(library).toHaveCount(0);
});
test("Studio popup is responsive and keeps chart object accessible",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/market-terminal/");
  await page.getByRole("group",{name:"Chart drawing categories"})
    .getByRole("button",{name:"Open Shapes tools"}).click();
  const library=page.getByRole("group",{name:"Advanced drawing tools"});
  await library.getByRole("button",{name:"Rectangle",exact:true}).click();
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("Chart not mounted");
  await page.mouse.move(box.x+box.width*.28,box.y+box.height*.36);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.67,{steps:12});await page.mouse.up();
  await page.getByRole("tab",{name:/Objects/}).click();
  await page.getByRole("button",{name:"Settings for drawing 1"}).click();
  const dialog=page.getByRole("dialog",{name:/Drawing settings/});
  await expect(dialog).toBeVisible();
  await shot(page,"studio-object-properties");
  const bounds=await dialog.boundingBox();
  expect(bounds&&bounds.x+bounds.width).toBeLessThanOrEqual(1368);
  await dialog.getByRole("tab",{name:"Coordinates"}).click();
  await expect(dialog.getByRole("spinbutton",{name:"start anchor price"})).toBeVisible();
  await dialog.getByRole("tab",{name:"Visibility"}).click();
  await expect(dialog.getByRole("checkbox",{name:"Visible on 1h"})).toBeVisible();
});
test("Mobile category rail, layered library and settings fit the phone",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Open Fib / Gann tools"}).click();
  const library=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(library.getByRole("button",{name:"Trend-based fib extension"})).toBeVisible();
  const size=await library.boundingBox();
  if(!size)throw new Error("Tool library missing");
  expect(size.x).toBeGreaterThanOrEqual(-2);
  expect(size.x+size.width).toBeLessThanOrEqual(392);
  await shot(page,"mobile-layered-tool-library");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
