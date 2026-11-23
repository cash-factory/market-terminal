import {test,expect} from "@playwright/test";

test("go to date navigates an observed candle rather than inventing market history",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Go to date"}).click();
  const dialog=page.getByRole("dialog",{name:"Go to chart date"});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("textbox",{name:"UTC chart date and time"})).toHaveValue(/.+/);
  await dialog.getByRole("button",{name:"Navigate"}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status").filter({hasText:"Navigated to observed"})).toBeVisible();
});

test("chart CSV download names exact selected source and frame",async({page})=>{
  await page.goto("/market-terminal/");
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button",{name:"Export displayed candles as CSV"}).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^market-terminal-EURUSD-demo-1h\.csv$/);
});

test("Go to date command is discoverable from the search palette",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Search markets & tools"}).click();
  const palette=page.getByRole("dialog",{name:"Search instruments and tools"});
  await palette.getByRole("combobox",{name:"Search instruments and tools"}).fill("Go to Date");
  await palette.getByRole("option",{name:/Go to Date/}).click();
  await expect(page.getByRole("dialog",{name:"Go to chart date"})).toBeVisible();
});
