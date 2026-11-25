import {test,expect} from "@playwright/test";

test("keyboard movement of favorites leaves the replay candle unchanged",async({page})=>{
 await page.goto("/market-terminal/");
 await page.getByRole("button",{name:"Start replay"}).click();
 const cursor=page.getByRole("slider",{name:"Replay position"});
 const originalCursor=await cursor.inputValue();
 const grip=page.getByRole("button",{name:"Move favorites toolbar"});
 const initialPosition=await grip.boundingBox();
 expect(initialPosition).not.toBeNull();
 await grip.press("ArrowRight");
 await expect.poll(async()=>(await grip.boundingBox())?.x).toBe(initialPosition!.x+16);
 await expect(cursor).toHaveValue(originalCursor);
 await expect(page.locator(".statusbar")).toContainText("REPLAY · HISTORICAL SNAPSHOT · SYNTHETIC");
});

test("watchlist favorites, ordering, add/remove and saved state survive reload",async({page})=>{
 await page.goto("/market-terminal/");
 const list=page.getByRole("region",{name:"Saved analyst watchlist"});
 await expect(list).toBeVisible();
 await expect(list.locator(".peak-watchlist-row")).toHaveCount(4);
 await page.getByRole("button",{name:"Pin US100"}).click();
 await expect(list.locator(".peak-watchlist-open").first()).toContainText("US100");
 await page.getByRole("button",{name:"Remove AAPL from watchlist"}).click();
 await expect(list.locator(".peak-watchlist-row")).toHaveCount(3);
 await page.getByRole("combobox",{name:"Add watchlist instrument"}).selectOption("AAPL");
 await expect(list.locator(".peak-watchlist-row")).toHaveCount(4);
 await page.reload();
 await expect(page.getByRole("button",{name:"Unpin US100"})).toBeVisible();
 await expect(page.getByRole("region",{name:"Saved analyst watchlist"}).locator(".peak-watchlist-open").first()).toContainText("US100");
});

test("position sizing is accessible as independent analysis, not order execution",async({page})=>{
 await page.goto("/market-terminal/");
 await page.getByRole("button",{name:"Position sizing",exact:true}).first().click();
 const inputs=page.getByRole("region",{name:"Risk planning parameters"});
 await expect(inputs).toBeVisible();
 await inputs.locator(".risk-form-grid input").nth(0).fill("10000");
 await inputs.locator(".risk-form-grid input").nth(2).fill("100");
 await inputs.locator(".risk-form-grid input").nth(3).fill("98");
 await inputs.locator(".risk-form-grid input").nth(4).fill("104");
 await expect(page.getByRole("region",{name:"Risk planning results"})).toContainText("50.000000");
 await page.reload();
 await page.getByRole("button",{name:"Position sizing",exact:true}).first().click();
 await expect(page.getByRole("region",{name:"Risk planning results"})).toContainText("50.000000");
});

test("replay scenario is armed causally and its result is archived locally",async({page})=>{
 await page.goto("/market-terminal/");
 await page.getByRole("button",{name:"Start replay"}).click();
 const lab=page.getByRole("region",{name:"Structured replay simulation"});
 await expect(lab).toBeVisible();
 const last=Number((await lab.locator(".peak-lab-reference strong").innerText()).replace(/,/g,""));
 await lab.getByRole("spinbutton",{name:"Simulation stop"}).fill(String(last-.00005));
 await lab.getByRole("spinbutton",{name:"Simulation target"}).fill(String(last+.00005));
 await lab.getByRole("button",{name:"Arm next-bar scenario"}).click();
 await expect(lab).toContainText("Armed · next candle open");
 await page.getByRole("button",{name:"Step forward"}).click();
 await expect(lab).not.toContainText("Armed · next candle open");
 const slider=page.getByRole("slider",{name:"Replay position"});
 await slider.focus();
 await slider.press("End");
 await expect(lab.getByRole("button",{name:"Save study"})).toBeVisible();
 await lab.getByRole("button",{name:"Save study"}).click();
 await page.getByRole("button",{name:"Workspace",exact:true}).first().click();
 await expect(page.getByRole("region",{name:"Saved simulation studies"})).toContainText("EURUSD");
 await page.reload();
 await page.getByRole("button",{name:"Workspace",exact:true}).first().click();
 await expect(page.getByRole("region",{name:"Saved simulation studies"})).toContainText("EURUSD");
});

test("selected chart long position transfers entry, stop and target into standalone calculator",async({page})=>{
 await page.goto("/market-terminal/");
 await page.getByRole("button",{name:"More drawing tools"}).click();
 await page.getByRole("group",{name:"Advanced drawing tools"}).getByRole("button",{name:"Long position",exact:true}).click();
 const box=await page.locator("svg.drawing-overlay").first().boundingBox();
 if(!box)throw new Error("Drawing overlay was not mounted");
 await page.mouse.move(box.x+box.width*.29,box.y+box.height*.35);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width*.63,box.y+box.height*.62,{steps:12});
 await page.mouse.up();
 await expect(page.locator(".drawing-position-risk")).toHaveCount(1);
 const drawing=await page.evaluate(()=>{
   const workspace=JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}");
   return workspace.preferences.drawings[0] as {start:{price:number};end:{price:number};target?:{price:number}};
 });
 await page.getByRole("button",{name:"Position sizing",exact:true}).first().click();
 const selected=page.getByRole("button",{name:"Use selected position"});
 await expect(selected).toBeVisible();
 await selected.click();
 const form=page.getByRole("region",{name:"Risk planning parameters"});
 await expect(form.getByRole("spinbutton",{name:"Proposed entry"})).toHaveValue(String(drawing.start.price));
 await expect(form.getByRole("spinbutton",{name:"Protective stop-loss"})).toHaveValue(String(drawing.end.price));
 if(drawing.target)await expect(form.getByRole("spinbutton",{name:"Take-profit (optional)"})).toHaveValue(String(drawing.target.price));
});
