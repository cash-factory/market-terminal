import {expect,test} from "@playwright/test";

test("changing timeframe or symbol exits incompatible frozen historical replay",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Start replay"}).click();
  await expect(page.getByRole("button",{name:"Exit replay"})).toBeVisible();
  await page.getByRole("button",{name:"5m",exact:true}).click();
  await expect(page.getByRole("button",{name:"Start replay"})).toBeVisible();
  await page.getByRole("button",{name:"Start replay"}).click();
  await expect(page.getByRole("button",{name:"Exit replay"})).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox",{name:"Search instruments and tools"}).fill("BTCUSDT");
  await page.getByRole("combobox",{name:"Search instruments and tools"}).press("Enter");
  await expect(page.getByRole("button",{name:"Start replay"})).toBeVisible();
  await expect(page.getByRole("button",{name:"Choose chart instrument"})).toHaveText("BTC / USDT");
});
