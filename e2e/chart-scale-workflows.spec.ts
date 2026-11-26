import {test,expect} from "@playwright/test";

test("price scale preset and inversion survive reload across the chart",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Chart setup"}).click();
  const mode=page.getByRole("combobox",{name:"Chart price scale mode"});
  await expect(mode).toBeVisible();
  await mode.selectOption("log");
  const invert=page.getByRole("button",{name:"Invert chart price scale"});
  await invert.click();
  await expect(invert).toHaveAttribute("aria-pressed","true");
  await mode.selectOption("percent");
  await page.reload();
  await page.getByRole("button",{name:"Chart setup"}).click();
  await expect(page.getByRole("combobox",{name:"Chart price scale mode"})).toHaveValue("percent");
  await expect(page.getByRole("button",{name:"Invert chart price scale"})).toHaveAttribute("aria-pressed","true");
});

test("price scale is controllable from the universal command search",async({page})=>{
  await page.goto("/market-terminal/");
  await page.keyboard.press("Control+k");
  const palette=page.getByRole("dialog",{name:"Search instruments and tools"});
  await palette.getByRole("combobox",{name:"Search instruments and tools"}).fill("Log Price Scale");
  await palette.getByRole("option",{name:/Log Price Scale/}).click();
  await page.getByRole("button",{name:"Chart setup"}).click();
  await expect(page.getByRole("combobox",{name:"Chart price scale mode"})).toHaveValue("log");
});
