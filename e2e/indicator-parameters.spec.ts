import {test,expect} from "@playwright/test";

test("custom indicator periods update charts and persist through saved templates",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await page.getByRole("checkbox",{name:"RSI 14"}).check();
  await page.getByRole("checkbox",{name:"EMA 20"}).check();
  await page.getByRole("spinbutton",{name:"RSI period"}).fill("21");
  await page.getByRole("spinbutton",{name:"EMA period"}).fill("34");
  await page.getByRole("spinbutton",{name:"MACD fast"}).fill("10");
  await expect(page.locator(".indicator-pane-label")).toContainText("RSI · 21");
  await page.getByRole("textbox",{name:"Template name"}).fill("Configured Studies");
  await page.getByRole("button",{name:"Save study template"}).click();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  const template=before.preferences.chartTemplates.find((t:{name:string})=>t.name==="Configured Studies");
  expect(template.parameters).toMatchObject({rsiPeriod:21,emaPeriod:34,macdFast:10});
  await page.getByRole("button",{name:"Reset periods"}).click();
  await expect(page.getByRole("spinbutton",{name:"RSI period"})).toHaveValue("14");
  await page.getByRole("combobox",{name:"Apply chart template"}).selectOption(template.id);
  await expect(page.getByRole("spinbutton",{name:"RSI period"})).toHaveValue("21");
  await expect(page.getByRole("spinbutton",{name:"EMA period"})).toHaveValue("34");
  await page.getByRole("button",{name:"Close indicator menu"}).click();
  await page.reload();
  await expect(page.locator(".indicator-pane-label")).toContainText("RSI · 21");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await expect(page.getByRole("spinbutton",{name:"RSI period"})).toHaveValue("21");
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(restored.preferences.studyParameters.rsiPeriod).toBe(21);
});
