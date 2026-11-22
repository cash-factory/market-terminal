import { expect, test } from "@playwright/test";

test("the drawing context stays in place through a stroke edit", async ({page}) => {
  await page.setViewportSize({width:1363, height:936});
  await page.goto("/market-terminal/");
  const overlay = page.locator("svg.drawing-overlay").first();
  await expect(overlay).toBeVisible();
  const chart = await overlay.boundingBox();
  if (!chart) throw new Error("Missing primary chart");
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  await page.mouse.move(chart.x + chart.width * 0.25, chart.y + chart.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(chart.x + chart.width * 0.65, chart.y + chart.height * 0.35,{steps:8});
  await page.mouse.up();
  await page.getByLabel("Quick stroke weight").selectOption("5");
  await expect(page.getByLabel("Selected drawing weight")).toHaveValue("5");
  await page.getByRole("button",{name:"Done",exact:true}).click();
  await expect(page.getByRole("status").filter({hasText:"Navigate"})).toBeVisible();
  expect(await overlay.boundingBox()).toEqual(chart);
  const surface = await page.locator(".chart-surface").first().boundingBox();
  expect(surface && surface.y + surface.height).toBeLessThanOrEqual(936);
});
