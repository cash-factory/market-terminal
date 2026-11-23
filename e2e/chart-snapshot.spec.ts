import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";

test("PNG snapshot includes actual chart geometry and is a valid image",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("The chart is not ready");
  await page.mouse.move(box.x+box.width*.3,box.y+box.height*.4);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button",{name:"Export chart PNG"}).click()
  ]);
  expect(download.suggestedFilename()).toBe("market-terminal-EURUSD-demo-1h.png");
  const file=await download.path();
  if(!file)throw new Error("Browser did not expose completed PNG download");
  const bytes=await readFile(file);
  expect(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))).toBe(true);
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(300);
  expect(bytes.readUInt32BE(20)).toBeGreaterThan(200);
  expect(bytes.length).toBeGreaterThan(5000);
  await expect(page.getByRole("status").filter({hasText:"Price chart image saved"})).toBeVisible();
});

test("chart snapshot action is discoverable in the command palette",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Search markets & tools"}).click();
  const palette=page.getByRole("dialog",{name:"Search instruments and tools"});
  await palette.getByRole("combobox",{name:"Search instruments and tools"}).fill("Export Chart PNG");
  await expect(palette.getByRole("option",{name:/Export Chart PNG/})).toBeVisible();
});
