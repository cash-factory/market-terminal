import {test,expect} from "@playwright/test";

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
