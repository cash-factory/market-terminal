import {test,expect} from "@playwright/test";

test("watchlists create a named list, add an instrument, annotate and persist",async({page})=>{
  await page.goto("/market-terminal/");
  const rail=page.getByRole("region",{name:"Watchlist workspace"});
  await expect(rail).toBeVisible();
  await expect(rail.getByText("Synthetic quotes")).toBeVisible();
  await rail.getByRole("button",{name:"Manage watchlists"}).click();
  await rail.getByRole("textbox",{name:"New watchlist name"}).fill("Breakout review");
  await rail.getByRole("button",{name:"Create watchlist"}).click();
  await expect(rail.getByRole("combobox",{name:"Active watchlist"})).toHaveValue(/.+/);
  await expect(rail.getByRole("button",{name:"Open EURUSD chart"})).toHaveCount(0);
  await rail.getByRole("button",{name:"Add instrument to watchlist"}).click();
  await expect(rail.getByRole("button",{name:"Open EURUSD chart"})).toBeVisible();
  await rail.getByRole("button",{name:"Edit note for EURUSD"}).click();
  await rail.getByRole("textbox",{name:"Watchlist note EURUSD"}).fill("Wait for structural confirmation");
  await rail.getByRole("button",{name:"Star EURUSD"}).click();
  await expect(rail.getByRole("button",{name:"Unstar EURUSD"})).toHaveAttribute("aria-pressed","true");
  await page.reload();
  const restored=page.getByRole("region",{name:"Watchlist workspace"});
  await expect(restored.getByRole("button",{name:"Open EURUSD chart"})).toBeVisible();
  await expect(restored.getByRole("button",{name:"Unstar EURUSD"})).toHaveAttribute("aria-pressed","true");
  await restored.getByRole("button",{name:"Edit note for EURUSD"}).click();
  await expect(restored.getByRole("textbox",{name:"Watchlist note EURUSD"})).toHaveValue("Wait for structural confirmation");
});

test("watchlist sections preserve instruments when deleted and remain sortable",async({page})=>{
  await page.goto("/market-terminal/");
  const rail=page.getByRole("region",{name:"Watchlist workspace"});
  await rail.getByRole("textbox",{name:"New section name"}).fill("Swing");
  await rail.getByRole("button",{name:"Add watchlist section"}).click();
  await expect(rail.getByRole("region",{name:"Watchlist section Swing"})).toBeVisible();
  await rail.getByRole("combobox",{name:"Section for BTCUSDT"}).selectOption({label:"Swing"});
  await expect(rail.getByRole("region",{name:"Watchlist section Swing"})
    .getByRole("button",{name:"Open BTCUSDT chart"})).toBeVisible();
  await rail.getByRole("button",{name:"Remove section Swing"}).click();
  await expect(rail.getByRole("region",{name:"Watchlist section Swing"})).toHaveCount(0);
  await expect(rail.getByRole("button",{name:"Open BTCUSDT chart"})).toBeVisible();
  await rail.getByRole("combobox",{name:"Sort watchlist"}).selectOption("change");
  await expect(rail.getByText("Synthetic quotes")).toBeVisible();
});

test("screener filters demonstration prices and adds results to active list",async({page})=>{
  await page.goto("/market-terminal/");
  const rail=page.getByRole("region",{name:"Watchlist workspace"});
  await rail.getByRole("button",{name:"Manage watchlists"}).click();
  await rail.getByRole("textbox",{name:"New watchlist name"}).fill("Scanner candidates");
  await rail.getByRole("button",{name:"Create watchlist"}).click();
  await page.getByRole("navigation",{name:"Workstation pages"}).getByRole("button",{name:"Screener"}).click();
  const screener=page.getByRole("main",{name:"Market screener"});
  await expect(screener).toBeVisible();
  await expect(screener.getByText("DEMONSTRATION DATA")).toBeVisible();
  await screener.getByRole("textbox",{name:"Search screener symbols"}).fill("AAPL");
  await expect(screener.getByRole("button",{name:"Open screener chart AAPL"})).toBeVisible();
  await expect(screener.getByRole("button",{name:"Open screener chart BTCUSDT"})).toHaveCount(0);
  await screener.getByRole("button",{name:"Add AAPL to watchlist"}).click();
  await expect(screener.getByText("Destination:")).toBeVisible();
  await page.getByRole("navigation",{name:"Workstation pages"}).getByRole("button",{name:"Chart workspace"}).click();
  await expect(page.getByRole("region",{name:"Watchlist workspace"})
    .getByRole("button",{name:"Open AAPL chart"})).toBeVisible();
});

test("screener empty results are explicit, not fabricated",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("navigation",{name:"Workstation pages"}).getByRole("button",{name:"Screener"}).click();
  await page.getByRole("textbox",{name:"Search screener symbols"}).fill("UNSUPPORTED_REAL_TICKER");
  await expect(page.getByText("No matches. Relax a filter or reset the screen.")).toBeVisible();
});
