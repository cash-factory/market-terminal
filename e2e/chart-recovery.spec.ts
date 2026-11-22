import {test,expect} from "@playwright/test";

test("transient chart fault can be retried without losing workspace state",async({page})=>{
  await page.addInitScript(()=>{
    // Force a synchronous chart initialization failure inside React's effect.
    // A ResizeObserver callback can be handled internally by the chart library
    // and therefore is not a reliable test of React error boundaries.
    const nativeCreateElement=document.createElement.bind(document);
    let shouldFail=true;
    document.createElement=((tagName:string,options?:ElementCreationOptions)=>{
      if(shouldFail&&tagName.toLowerCase()==="canvas"){
        shouldFail=false;
        throw new Error("Synthetic one-shot chart canvas creation fault");
      }
      return nativeCreateElement(tagName,options);
    }) as typeof document.createElement;
  });
  await page.goto("/market-terminal/?classic");
  await expect(page.getByRole("alert").filter({hasText:"Primary chart could not render"}))
    .toBeVisible({timeout:10_000});
  await page.getByRole("button",{name:"Retry Primary chart"}).click();
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
  await page.getByRole("button",{name:"Trendline",exact:true}).click();
  const box=await page.locator("svg.drawing-overlay").boundingBox();
  if(!box)throw new Error("Chart didn't recover");
  await page.mouse.move(box.x+box.width*.3,box.y+box.height*.4);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:10});
  await page.mouse.up();
  await expect(page.locator(".drawing-shape")).toHaveCount(1);
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.preferences.drawings).toHaveLength(1);
});
test("normal four-pane rendering shows no recovery panels",async({page})=>{
  await page.goto("/market-terminal/?classic");
  await page.getByRole("button",{name:"Toggle four-chart layout"}).click();
  await expect(page.locator(".chart-grid-cell")).toHaveCount(4);
  await expect(page.locator(".chart-failure")).toHaveCount(0);
  await expect(page.locator("svg.drawing-overlay")).toHaveCount(4);
});
