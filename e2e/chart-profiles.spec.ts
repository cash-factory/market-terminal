import {test,expect} from "@playwright/test";

test("save and restore complete multi-chart workspace without deleting drawings or alerts",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await page.getByRole("combobox",{name:"Secondary chart symbol"}).selectOption("AAPL");
  await page.getByRole("combobox",{name:"Chart 2 timeframe"}).selectOption("5m");
  await page.getByRole("combobox",{name:"Chart 3 timeframe"}).selectOption("4h");
  await page.getByRole("combobox",{name:"Chart display style"}).selectOption("area");
  await page.getByRole("button",{name:"Link chart crosshairs"}).click();
  await page.getByRole("button",{name:"Chart workspace profiles"}).click();
  await page.getByRole("textbox",{name:"Chart profile name"}).fill("Multi-market desk");
  await page.getByRole("button",{name:"Save chart profile"}).click();
  await expect(page.getByRole("button",{name:"Apply chart profile Multi-market desk"})).toBeVisible();
  await page.getByRole("button",{name:"Close chart profiles"}).click();
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await page.getByRole("combobox",{name:"Chart display style"}).selectOption("line");
  await page.getByRole("button",{name:"Link chart crosshairs"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(1);
  await page.getByRole("button",{name:"Chart workspace profiles"}).click();
  await page.getByRole("button",{name:"Apply chart profile Multi-market desk"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await expect(page.getByRole("combobox",{name:"Chart 2 timeframe"})).toHaveValue("5m");
  await expect(page.getByRole("combobox",{name:"Chart 3 timeframe"})).toHaveValue("4h");
  await expect(page.getByRole("combobox",{name:"Chart display style"})).toHaveValue("area");
  await expect(page.getByRole("button",{name:"Link chart crosshairs"})).toHaveAttribute("aria-pressed","true");
  await page.reload();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await page.getByRole("button",{name:"Chart workspace profiles"}).click();
  await expect(page.getByRole("button",{name:"Apply chart profile Multi-market desk"})).toBeVisible();
  let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.chartProfiles).toHaveLength(1);
  expect(saved.preferences.chartProfiles[0].settings).toMatchObject({
    secondarySymbol:"AAPL",secondaryFrame:"5m",tertiaryFrame:"4h",linkCrosshairs:true
  });
  await page.getByRole("button",{name:"Delete chart profile Multi-market desk"}).click();
  await expect(page.getByRole("button",{name:"Apply chart profile Multi-market desk"})).toHaveCount(0);
  saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.chartProfiles).toHaveLength(0);
});
