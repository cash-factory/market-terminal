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
  await panel.getByRole("button",{name:"Capture current thesis"}).click();
  await expect(page.getByRole("heading",{name:"Decision Desk."})).toBeVisible();
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
