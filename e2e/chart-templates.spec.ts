import {test,expect} from "@playwright/test";

test("built-in and saved chart setups apply and persist without affecting drawings",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await page.getByRole("combobox",{name:"Apply chart template"}).selectOption("builtin:momentum");
  await expect(page.getByRole("checkbox",{name:"RSI 14"})).toBeChecked();
  await expect(page.getByRole("checkbox",{name:"MACD 12/26/9"})).toBeChecked();
  await expect(page.getByRole("button",{name:"15m",exact:true})).toHaveClass(/active/);
  await page.getByRole("textbox",{name:"Template name"}).fill("My Momentum");
  await page.getByRole("button",{name:"Save study template"}).click();
  await expect(page.getByRole("combobox",{name:"Apply chart template"})).toContainText("My Momentum");
  await page.getByRole("combobox",{name:"Apply chart template"}).selectOption("builtin:clean");
  await expect(page.getByRole("checkbox",{name:"RSI 14"})).not.toBeChecked();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  const customId=saved.preferences.chartTemplates.find((t:{name:string})=>t.name==="My Momentum")?.id;
  expect(customId).toBeTruthy();
  await page.getByRole("combobox",{name:"Apply chart template"}).selectOption(customId);
  await expect(page.getByRole("checkbox",{name:"MACD 12/26/9"})).toBeChecked();
  await page.getByRole("button",{name:"Close indicator menu"}).click();
  await page.reload();
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await expect(page.getByRole("checkbox",{name:"RSI 14"})).toBeChecked();
  await expect(page.getByRole("combobox",{name:"Apply chart template"})).toContainText("My Momentum");
  await page.getByRole("button",{name:"Delete template My Momentum"}).click();
  await expect(page.getByRole("combobox",{name:"Apply chart template"})).not.toContainText("My Momentum");
});
