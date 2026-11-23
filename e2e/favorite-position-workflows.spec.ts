import {test,expect,type Page} from "@playwright/test";

async function draw(page:Page,from:[number,number],to:[number,number]){
 const chart=await page.locator("svg.drawing-overlay").first().boundingBox();
 if(!chart)throw new Error("Drawing overlay not mounted");
 await page.mouse.move(chart.x+chart.width*from[0],chart.y+chart.height*from[1]);
 await page.mouse.down();
 await page.mouse.move(chart.x+chart.width*to[0],chart.y+chart.height*to[1],{steps:12});
 await page.mouse.up();
}

test("floating favorites can reorder, orient, move, hide and persist",async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await page.goto("/market-terminal/");
 const bar=page.getByRole("toolbar",{name:"Floating favorite drawing tools"});
 await expect(bar).toBeVisible();
 await expect(bar.getByRole("button",{name:"Favorite Trendline"})).toBeVisible();
 await bar.getByRole("button",{name:"Edit favorites toolbar"}).click();
 await bar.getByRole("button",{name:"Move Rectangle earlier"}).click();
 let stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
 await expect.poll(async()=>{
   const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
   return state.preferences?.favoriteDrawingTools?.slice(0,3);
 }).toEqual(["trendline","rectangle","horizontal-ray"]);
 await bar.getByRole("button",{name:"Edit favorites toolbar"}).click();
 await bar.getByRole("button",{name:"Change favorites toolbar orientation"}).click();
 await expect(bar).toHaveClass(/vertical/);
 const grip=bar.getByRole("button",{name:"Move favorites toolbar"});
 const before=await bar.boundingBox();
 if(!before)throw new Error("No toolbar bounds");
 const handle=await grip.boundingBox();
 if(!handle)throw new Error("No drag handle");
 await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
 await page.mouse.down();
 await page.mouse.move(handle.x+handle.width/2+65,handle.y+handle.height/2+70,{steps:8});
 await page.mouse.up();
 const after=await bar.boundingBox();
 expect(after).not.toBeNull();
 expect(after!.x).toBeGreaterThan(before.x+20);
 await bar.getByRole("button",{name:"Hide favorites toolbar"}).click();
 await expect(bar).toHaveCount(0);
 await page.getByRole("button",{name:"Show floating favorites toolbar"}).click();
 await expect(bar).toBeVisible();
 await page.reload();
 await expect(page.getByRole("toolbar",{name:"Floating favorite drawing tools"})).toHaveClass(/vertical/);
 stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
 expect(stored.preferences.favoriteBar).toMatchObject({visible:true,orientation:"vertical"});
 expect(stored.preferences.favoriteDrawingTools.slice(0,3)).toEqual(["trendline","rectangle","horizontal-ray"]);
});

test("long position settings calculate net risk, quantity, fees, leverage and persist",async({page})=>{
 await page.goto("/market-terminal/?classic");
 await page.getByRole("button",{name:"More drawing tools"}).click();
 await page.getByRole("group",{name:"Advanced drawing tools"}).getByRole("button",{name:"Long position",exact:true}).click();
 await draw(page,[.29,.35],[.63,.62]);
 await expect(page.locator(".drawing-position-risk")).toHaveCount(1);
 await page.getByRole("button",{name:"Settings for drawing 1"}).click();
 const dialog=page.getByRole("dialog",{name:/Drawing settings/});
 await dialog.getByRole("tab",{name:"Position"}).click();
 await expect(dialog.getByRole("region",{name:"Position planning settings"})).toBeVisible();
 await dialog.getByRole("spinbutton",{name:"Account equity"}).fill("10000");
 await dialog.getByRole("spinbutton",{name:"Risk allocation (%)"}).fill("2");
 await dialog.getByRole("spinbutton",{name:"Fee per side (basis points)"}).fill("10");
 await dialog.getByRole("spinbutton",{name:"Adverse slippage (ticks per side)"}).fill("1");
 await dialog.getByRole("spinbutton",{name:"Illustrative leverage"}).fill("5");
 await expect(dialog.getByText("Calculated position outcomes")).toBeVisible();
 await expect(dialog.getByText("Estimated target profit, after costs")).toBeVisible();
 await dialog.getByRole("button",{name:"Apply changes"}).click();
 await expect(page.locator(".drawing-position-reward")).toHaveCount(1);
 await expect.poll(async()=>{
   const data=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
   return data.preferences?.drawings?.[0]?.positionSettings?.feeBps;
 }).toBe(10);
 await page.reload();
 await page.getByRole("button",{name:"Settings for drawing 1"}).click();
 const restored=page.getByRole("dialog",{name:/Drawing settings/});
 await restored.getByRole("tab",{name:"Position"}).click();
 await expect(restored.getByRole("spinbutton",{name:"Risk allocation (%)"})).toHaveValue("2");
 await expect(restored.getByRole("spinbutton",{name:"Illustrative leverage"})).toHaveValue("5");
 await restored.getByRole("button",{name:"Size by risk budget"}).click();
 await restored.getByRole("button",{name:"Fixed quantity"}).click();
 await restored.getByRole("spinbutton",{name:"Fixed position quantity"}).fill("3");
 await expect(restored.getByText("3 units")).toBeVisible();
 await restored.getByRole("button",{name:"Apply changes"}).click();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
 expect(state.preferences.drawings[0].positionSettings).toMatchObject({sizing:"quantity",quantity:3,feeBps:10,leverage:5});
});

test("short position calculations and cost assumptions are independent of long positions",async({page})=>{
 await page.goto("/market-terminal/?classic");
 await page.getByRole("button",{name:"More drawing tools"}).click();
 await page.getByRole("group",{name:"Advanced drawing tools"}).getByRole("button",{name:"Short position",exact:true}).click();
 await draw(page,[.28,.68],[.62,.35]);
 await expect(page.locator(".drawing-position-reward")).toHaveCount(1);
 await page.getByRole("button",{name:"Settings for drawing 1"}).click();
 const dialog=page.getByRole("dialog",{name:/Drawing settings/});
 await dialog.getByRole("tab",{name:"Position"}).click();
 await expect(dialog.getByText("Estimated stop loss, after costs")).toBeVisible();
 await expect(dialog.getByText("Net reward / risk")).toBeVisible();
});
