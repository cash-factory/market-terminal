import {test,expect} from "@playwright/test";

test("Chart Context Lens converts marked levels into measured distances and active in-tab alerts",async({page})=>{
  await page.goto("/market-terminal/?classic");
  const raw=await page.locator(".chart-heading .quote strong").textContent();
  const quote=Number((raw??"").replace(/,/g,""));
  expect(Number.isFinite(quote)&&quote>0).toBe(true);
  const above=(quote*1.03).toFixed(5),below=(quote*.97).toFixed(5);
  const input=page.getByRole("spinbutton",{name:"Level price"});
  await input.fill(above);
  await page.getByRole("button",{name:"Add price level"}).click();
  await input.fill(below);
  await page.getByRole("button",{name:"Add price level"}).click();
  await page.getByRole("tab",{name:"Context"}).click();
  const panel=page.getByRole("tabpanel",{name:"Chart Context Lens"});
  await expect(panel.getByText("Marked price levels")).toBeVisible();
  await expect(panel.getByText("Above observed close")).toBeVisible();
  await expect(panel.getByText("Below observed close")).toBeVisible();
  await expect(panel.getByText("Synthetic demonstration candles")).toBeVisible();
  await panel.getByRole("button",{name:/Arm alert at/}).first().click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.alerts).toHaveLength(1);
  expect(saved.preferences.alerts[0]).toMatchObject({
    symbol:"EURUSD",source:"demo",direction:"above",triggeredAtMs:null
  });
  await panel.getByRole("button",{name:"Open saved chart objects and levels"}).click();
  await expect(page.getByRole("tab",{name:/Objects/})).toHaveAttribute("aria-selected","true");
});

test("Tool Atlas opens Chart Context Lens and it remains accessible on a narrow viewport",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.keyboard.press("Control+k");
  const search=page.getByRole("combobox",{name:"Search instruments and tools"});
  await search.fill("Chart Context Lens");
  await search.press("Enter");
  await expect(page.getByRole("tab",{name:"Context"})).toHaveAttribute("aria-selected","true");
  await expect(page.getByRole("tabpanel",{name:"Chart Context Lens"})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});

test("Inspector tabs support keyboard arrows and visible focus feedback",async({page})=>{
  await page.goto("/market-terminal/?classic");
  const markets=page.getByRole("tab",{name:"Markets"});
  const objects=page.getByRole("tab",{name:/Objects/});
  const context=page.getByRole("tab",{name:"Context"});
  await markets.focus();
  await expect(markets).toHaveAttribute("aria-selected","true");
  await page.keyboard.press("ArrowRight");
  await expect(objects).toBeFocused();
  await expect(objects).toHaveAttribute("aria-selected","true");
  await page.keyboard.press("ArrowRight");
  await expect(context).toBeFocused();
  await expect(page.getByRole("tabpanel",{name:"Chart Context Lens"})).toBeVisible();
  await page.keyboard.press("Home");
  await expect(markets).toBeFocused();
  await expect(markets).toHaveAttribute("aria-selected","true");
});
