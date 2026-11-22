import {test,expect,type Page} from "@playwright/test";

async function drawRectangle(page:Page){
  await page.getByRole("button",{name:"Rectangle",exact:true}).click();
  const box=await page.locator("svg.drawing-overlay").first().boundingBox();
  if(!box)throw new Error("Chart canvas missing");
  const from={x:box.x+box.width*.32,y:box.y+box.height*.32};
  const to={x:box.x+box.width*.57,y:box.y+box.height*.62};
  await page.mouse.move(from.x,from.y);await page.mouse.down();
  await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up();
}
test("five chart display styles retain working drawing tools and local persistence",async({page})=>{
  await page.goto("/market-terminal/?classic");
  const select=page.getByRole("combobox",{name:"Chart display style"});
  for(const style of ["ohlc-bars","line","area","heikin-ashi","candles"]){
    await select.selectOption(style);
    await expect(page.locator(".chart-canvas canvas").first()).toBeVisible();
    const before=await page.locator(".drawing-shape").count();
    await drawRectangle(page);
    await expect(page.locator(".drawing-shape")).toHaveCount(before+1);
    if(style==="heikin-ashi")
      await expect(page.getByText("Heikin Ashi is a derived OHLC chart transformation")).toBeVisible();
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(saved.preferences.chartDisplayStyle).toBe("candles");
  expect(saved.preferences.drawings).toHaveLength(5);
  await page.reload();
  await expect(page.locator(".drawing-shape")).toHaveCount(5);
  await expect(page.getByRole("combobox",{name:"Chart display style"})).toHaveValue("candles");
});
test("Heikin-Ashi view remains labelled after refresh and preserves raw alert/quote source",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("combobox",{name:"Chart display style"}).selectOption("heikin-ashi");
  await page.reload();
  await expect(page.getByRole("combobox",{name:"Chart display style"})).toHaveValue("heikin-ashi");
  await expect(page.getByText(/not broker-executable prices/)).toBeVisible();
});
