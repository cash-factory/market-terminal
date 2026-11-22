import {test,expect} from "@playwright/test";

/** A deterministic four-chart local-storage stress fixture. This test is a
 * performance baseline and behavioral regression, not a blanket claim about
 * devices with limited RAM or production streaming history.
 */
test("restore 1,000 independently persisted objects in a four-chart workstation",async({page})=>{
  test.setTimeout(120_000);
  const pageErrors:string[]=[];
  page.on("pageerror",error=>pageErrors.push(error.message));
  await page.goto("/market-terminal/?classic");
  const startingBars=await page.locator(".technical-chart-stack").first()
    .getAttribute("data-visible-candles");
  expect(Number(startingBars)).toBeGreaterThan(100);
  await page.evaluate(()=>{
    const key="market-terminal-workspace";
    const exportValue=JSON.parse(localStorage.getItem(key)??"{}");
    const prefs=exportValue.preferences;
    const now=Math.floor(Date.now()/3_600_000)*3_600;
    prefs.chartLayout="quad";
    prefs.drawings=Array.from({length:1_000},(_,i)=>({
      id:"stress-drawing-"+i,symbol:"EURUSD",source:"demo",
      tool:i%3===0?"rectangle":i%3===1?"trendline":"ray",
      locked:false,hidden:false,color:i%2===0?"#8d8df2":"#29b89a",
      start:{time:now-(300-i%250)*3600,price:1.08+(i%25)*0.00012},
      end:{time:now-(296-i%250)*3600,price:1.081+(i%25)*0.00012}
    }));
    localStorage.setItem(key,JSON.stringify(exportValue));
  });
  const startedAt=Date.now();
  await page.reload({waitUntil:"domcontentloaded"});
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await expect(page.locator(".drawing-shape")).toHaveCount(1_000,{timeout:45_000});
  const loadMs=Date.now()-startedAt;
  console.log("PHASE1_BENCHMARK four_panes_drawings1000_reload_ms="+loadMs);
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const overlay=page.locator("svg.drawing-overlay").first();
  await overlay.scrollIntoViewIfNeeded();
  const rect=await overlay.boundingBox();
  if(!rect)throw new Error("Large workspace chart missing.");
  await page.mouse.move(rect.x+rect.width*.31,rect.y+rect.height*.38);
  await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.62,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".drawing-shape")).toHaveCount(1_001,{timeout:30_000});
  const persisted=await page.evaluate(()=>JSON.parse(
    localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(persisted.preferences.drawings).toHaveLength(1_001);
  expect(pageErrors).toEqual([]);
});
