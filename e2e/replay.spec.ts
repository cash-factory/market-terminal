import {test,expect} from "@playwright/test";

test("replay reveals historical candles one by one and returns to active chart",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await expect(page.locator(".technical-chart-stack")).toHaveAttribute("data-visible-candles","360");
  await page.getByRole("button",{name:"Start replay"}).click();
  await expect(page.getByRole("region",{name:"Historical candle replay"})).toBeVisible();
  await expect(page.locator(".technical-chart-stack")).toHaveAttribute("data-visible-candles","180");
  await expect(page.getByText("REPLAY BAR CLOSE")).toBeVisible();
  await page.getByRole("button",{name:"Step forward"}).click();
  await expect(page.locator(".technical-chart-stack")).toHaveAttribute("data-visible-candles","181");
  await page.getByRole("combobox",{name:"Replay playback speed"}).selectOption("4");
  await page.locator(".replay-exit").click();
  await expect(page.locator(".technical-chart-stack")).toHaveAttribute("data-visible-candles","360");
  await expect(page.getByText("REPLAY BAR CLOSE")).toHaveCount(0);
});

test("replay changes charts without interfering with indicator panes or other tools",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Technical indicators"}).click();
  await page.getByRole("checkbox",{name:"RSI 14"}).check();
  await page.getByRole("button",{name:"Close indicator menu"}).click();
  await page.getByRole("button",{name:"Start replay"}).click();
  await expect(page.locator(".indicator-pane")).toHaveCount(1);
  await page.getByRole("button",{name:"Step forward"}).click();
  await expect(page.locator(".indicator-pane")).toHaveCount(1);
  await page.getByRole("button",{name:"5m",exact:true}).click();
  await expect(page.getByRole("region",{name:"Historical candle replay"})).toHaveCount(0);
  await expect(page.locator(".technical-chart-stack")).toHaveAttribute("data-visible-candles","360");
  await expect(page.locator(".indicator-pane")).toHaveCount(1);
});
