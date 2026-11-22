import { expect, test, type Page } from "@playwright/test";

async function chartPoint(page: Page, xFraction: number, yFraction: number) {
  const box = await page.locator("svg.drawing-overlay").boundingBox();
  if (!box) throw new Error("Chart drawing overlay is missing.");
  return { x: box.x + box.width * xFraction, y: box.y + box.height * yFraction };
}

async function drawDrag(page: Page, tool: string, start: [number, number], end: [number, number]) {
  await page.getByRole("button", { name: tool, exact: true }).click();
  const a = await chartPoint(page, start[0], start[1]);
  const b = await chartPoint(page, end[0], end[1]);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

test("draw, select, resize and persist a trendline in a real Chromium chart", async ({ page }) => {
  await page.goto("/market-terminal/?classic");
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
  await expect(page.locator(".chart-canvas canvas").first()).toBeVisible();

  await drawDrag(page, "Trendline", [0.28, 0.38], [0.56, 0.58]);
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await expect(page.locator(".drawing-overlay.armed")).toHaveCount(0);

  const hit = page.locator(".drawing-hit").first();
  const rect = await hit.boundingBox();
  if (!rect) throw new Error("Rendered trendline hit target not found.");
  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await expect(page.locator(".drawing-handle")).toHaveCount(2);

  const handle = await page.locator(".drawing-handle").first().boundingBox();
  if (!handle) throw new Error("Selected drawing resize handle not found.");
  const hx = handle.x + handle.width / 2, hy = handle.y + handle.height / 2;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 35, hy + 18, { steps: 8 });
  await page.mouse.up();

  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("market-terminal-workspace") ?? "{}"));
  expect(saved.preferences.drawings).toHaveLength(1);
  expect(saved.preferences.drawings[0].tool).toBe("trendline");
});

test("two clicks create rectangles; dragging creates Fibonacci; delete and undo restore", async ({ page }) => {
  await page.goto("/market-terminal/?classic");
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();

  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  const p1 = await chartPoint(page, 0.30, 0.32);
  const p2 = await chartPoint(page, 0.57, 0.62);
  await page.mouse.click(p1.x, p1.y);
  await expect(page.locator(".drawing-shape")).toHaveCount(1); // live preview
  await page.mouse.click(p2.x, p2.y);
  await expect(page.locator(".drawing-shape")).toHaveCount(1); // saved rectangle

  await drawDrag(page, "Fibonacci", [0.35, 0.28], [0.64, 0.65]);
  await expect(page.locator(".drawing-shape")).toHaveCount(2);

  await page.getByRole("button", { name: "Undo drawing" }).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.getByRole("button", { name: "Redo drawing" }).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(2);

  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  await expect(page.locator(".drawing-rectangle")).toHaveCount(1);
  expect(await page.locator(".drawing-line").count()).toBeGreaterThan(6);
});

test("Escape cancels a pending drawing and restores chart navigation", async ({ page }) => {
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button", { name: "Trendline", exact: true }).click();
  const p1 = await chartPoint(page, 0.34, 0.40);
  await page.mouse.click(p1.x, p1.y);
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".drawing-overlay.armed")).toHaveCount(0);
  await expect(page.locator(".drawing-shape")).toHaveCount(0);
});


test("drawing mode captures the actual chart surface, not the underlying candle canvas", async ({ page }) => {
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button", { name: "Trendline", exact: true }).click();
  const a = await chartPoint(page, 0.31, 0.38);
  const hit = await page.evaluate(({x,y}) => {
    const el = document.elementFromPoint(x,y);
    return {
      className: el?.getAttribute("class"),
      surface: (el as SVGElement | null)?.getAttribute("data-drawing-surface"),
      pointerEvents: el ? window.getComputedStyle(el).pointerEvents : "none"
    };
  }, a);
  expect(hit.surface, "The transparent drawing surface must be the true pointer target").toBe("true");
  expect(hit.pointerEvents).not.toBe("none");
  await page.mouse.click(a.x, a.y);
  const b = await chartPoint(page, 0.60, 0.60);
  await page.mouse.click(b.x, b.y);
  const workspace = await page.evaluate(() => JSON.parse(localStorage.getItem("market-terminal-workspace") ?? "{}"));
  expect(workspace.preferences.drawings).toHaveLength(1);
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
});

test("all synthetic market charts allow creating and retaining drawings across timeframes", async ({ page }) => {
  await page.goto("/market-terminal/?classic");
  for (const market of ["EUR / USD", "BTC / USDT", "AAPL", "US100"]) {
    await page.locator(".symbol-button").click();
    await page.getByRole("listbox").getByRole("option", { name: new RegExp(market.replace("/", "\\/")) }).click();
    await expect(page.locator("svg.drawing-overlay")).toBeVisible();
    await page.getByRole("button", { name: "1h", exact: true }).click();
    const before = await page.locator(".drawing-shape").count();
    await drawDrag(page, "Rectangle", [0.30, 0.40], [0.56, 0.62]);
    await expect(page.locator(".drawing-shape")).toHaveCount(before + 1);
    await page.getByRole("button", { name: "5m", exact: true }).click();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("market-terminal-workspace") ?? "{}"));
    expect(stored.preferences.drawings.filter((d: { symbol: string }) => d.symbol === ({ "EUR / USD":"EURUSD", "BTC / USDT":"BTCUSDT", AAPL:"AAPL", US100:"US100" } as Record<string,string>)[market])).toHaveLength(1);
    await page.getByRole("button", { name: "1h", exact: true }).click();
    await expect(page.locator(".drawing-shape")).toHaveCount(before + 1);
  }
});


test("object manager can hide, show, lock, unlock and duplicate drawings", async ({ page }) => {
  await page.goto("/market-terminal/?classic");
  await drawDrag(page, "Trendline", [0.32, 0.38], [0.58, 0.60]);
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.getByRole("button", { name: "Hide trendline 1" }).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(0);
  await page.getByRole("button", { name: "Show trendline 1" }).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.getByRole("button", { name: "Lock trendline 1" }).click();
  const savedLocked = await page.evaluate(() => JSON.parse(localStorage.getItem("market-terminal-workspace") ?? "{}"));
  expect(savedLocked.preferences.drawings[0].locked).toBe(true);
  await page.getByRole("button", { name: "Unlock trendline 1" }).click();
  await page.getByRole("button", { name: "Duplicate trendline 1" }).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  await page.getByRole("button", { name: "Delete trendline 2" }).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  await page.getByRole("button", { name: "Undo drawing" }).click();
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
});

test("repeat-mode draws multiple shapes without selecting the tool again", async ({ page }) => {
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button", { name: "Keep drawing tool active" }).click();
  await drawDrag(page, "Rectangle", [0.25, 0.30], [0.45, 0.50]);
  await expect(page.locator(".drawing-overlay.armed")).toHaveCount(1);
  const a = await chartPoint(page, 0.52, 0.38);
  const b = await chartPoint(page, 0.70, 0.60);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator(".drawing-shape")).toHaveCount(2);
  const workspace = await page.evaluate(() => JSON.parse(localStorage.getItem("market-terminal-workspace") ?? "{}"));
  expect(workspace.preferences.keepDrawingToolActive).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(".drawing-overlay.armed")).toHaveCount(0);
});
