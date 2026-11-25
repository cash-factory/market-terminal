import {expect,test} from "@playwright/test";
import {mkdirSync} from "node:fs";

test("chart range shortcuts change the viewport without changing the candle series",async({page})=>{
  await page.goto("/market-terminal/");
  const chart=page.locator(".technical-chart-stack").first();
  const range=chart.getByRole("group",{name:/chart range/});
  const count=await chart.getAttribute("data-visible-candles");
  await range.getByRole("button",{name:"Fit all"}).click();
  const surface=chart.locator(".chart-surface");
  const overview=await surface.screenshot();
  await range.getByRole("button",{name:"Show latest 30 bars"}).click();
  await expect.poll(async()=>(await surface.screenshot()).equals(overview)).toBe(false);
  await expect(chart).toHaveAttribute("data-visible-candles",count!);
  await expect(range.locator("time")).toHaveText(/\d\d:\d\d UTC/);
});

test("Peak workstation preserves opaque chart and functional chart drawing access",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/market-terminal/");
  const app=page.locator(".app.studio.peak-workstation");
  await expect(app).toBeVisible();
  await expect(page.locator(".peak-logo-lockup")).toBeVisible();
  await expect(page.locator(".primary-sidebar")).toBeVisible();
  await expect(page.locator(".instrument-header")).toHaveCSS("background-image","none");
  await expect(page.getByRole("button",{name:"Choose chart instrument"})).toBeVisible();
  const surface=page.locator(".chart-surface").first();
  await expect(surface).toBeVisible();
  await expect(surface).toHaveCSS("background-image","none");
  const surfaceBg=await surface.evaluate(e=>getComputedStyle(e).backgroundColor);
  expect(surfaceBg).not.toBe("rgba(0, 0, 0, 0)");

  await page.getByRole("button",{name:"Open Trend & channels tools"}).click();
  const library=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(library).toBeVisible();
  await expect(library.getByRole("button",{name:"Regression channel",exact:true})).toBeVisible();
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/peak-workstation-desktop.png",animations:"disabled"});
});

test("Peak overview works with assets and returns to the same chart",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/market-terminal/");
  const symbol=await page.locator(".instrument-header h1").innerText();
  await page.locator(".studio-destinations").getByRole("button",{name:"Overview"}).click();
  await expect(page.locator(".peak-home-hero")).toBeVisible();
  await expect(page.locator(".peak-home-metrics > div")).toHaveCount(4);
  await expect(page.locator(".peak-home-source-note")).toContainText("synthetic");
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/peak-overview-desktop.png",animations:"disabled"});
  await page.getByRole("button",{name:/Resume /}).click();
  await expect(page.locator(".instrument-header h1")).toContainText(symbol.split(" ")[0]);
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/peak-resumed-chart.png",animations:"disabled"});
});

test("Peak reduced-motion and opt-in sound preferences do not affect core chart controls",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/market-terminal/");
  const button=page.getByRole("button",{name:"Enable optional interface sounds"});
  await expect(button).toHaveAttribute("aria-pressed","false");
  await button.click();
  await expect(page.getByRole("button",{name:"Mute optional interface sounds"})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Preferences",exact:true}).last().click();
  await page.getByRole("button",{name:/Scenic background/}).click();
  await expect(page.locator(".app.peak-workstation")).toHaveClass(/peak-no-atmosphere/);
  await page.getByRole("button",{name:"Charts",exact:true}).click();
  await expect(page.locator(".chart-surface").first()).toBeVisible();
});

test("Peak mobile light mode keeps chart visible without horizontal page overflow",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await expect(page.getByRole("button",{name:"Choose chart instrument"})).toBeVisible();
  await page.getByRole("button",{name:"Switch appearance"}).click();
  await expect(page.locator(".app")).toHaveClass(/light/);
  await expect(page.locator(".instrument-header")).toHaveCSS("background-image","none");
  await page.getByRole("button",{name:"Open Trend & channels tools"}).click();
  const library=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(library).toBeVisible();
  const bounds=await library.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-2);
  expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(392);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  if(overflow>2){
    const offenders=await page.evaluate(()=>[...document.querySelectorAll("*")].map(el=>{
      const box=el.getBoundingClientRect();
      return {name:el.tagName,classes:String(el.className?.baseVal??el.className).slice(0,95),
        left:Math.round(box.left),right:Math.round(box.right),width:Math.round(box.width)};
    }).filter(x=>x.right>innerWidth+2&&x.left<innerWidth).sort((a,b)=>b.right-a.right).slice(0,18));
    console.log("Peak overflow diagnostics",JSON.stringify({overflow,offenders}));
  }
  expect(overflow).toBeLessThanOrEqual(2);
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/peak-workstation-mobile-light.png",animations:"disabled"});
});

test("Peak enterprise secondary pages and replay reveal their real controls",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/market-terminal/");
  mkdirSync("test-results/review",{recursive:true});
  await page.getByRole("button",{name:"Position sizing",exact:true}).first().click();
  await expect(page.getByRole("region",{name:"Risk planning parameters"})).toBeVisible();
  await page.screenshot({path:"test-results/review/peak-position-sizing.png",animations:"disabled"});
  await page.getByRole("button",{name:"Price Alerts",exact:true}).last().click();
  await expect(page.getByRole("region",{name:"Create a price alert"})).toBeVisible();
  await page.screenshot({path:"test-results/review/peak-alerts.png",animations:"disabled"});
  await page.getByRole("button",{name:"Workspace",exact:true}).first().click();
  await expect(page.getByRole("region",{name:"Saved simulation studies"})).toBeVisible();
  await page.screenshot({path:"test-results/review/peak-library.png",animations:"disabled"});
  await page.getByRole("button",{name:"Preferences",exact:true}).first().click();
  await expect(page.getByText("Atmosphere & feedback")).toBeVisible();
  await page.screenshot({path:"test-results/review/peak-preferences.png",animations:"disabled"});
  await page.getByRole("button",{name:"Charts",exact:true}).click();
  await page.getByRole("button",{name:"Start replay"}).click();
  await expect(page.getByRole("region",{name:"Structured replay simulation"})).toBeVisible();
  await page.screenshot({path:"test-results/review/peak-replay-workspace.png",animations:"disabled"});
});

test("Peak navigation reveals requested contextual panels instead of changing hidden state",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Hide watchlist"}).click();
  await expect(page.getByRole("tabpanel",{name:"Markets"})).toHaveCount(0);
  await page.locator(".studio-destinations").getByRole("button",{name:"Watchlists"}).click();
  await expect(page.getByRole("tabpanel",{name:"Markets"})).toBeVisible();
  await page.locator(".studio-destinations").getByRole("button",{name:"Layout"}).click();
  await expect(page.getByRole("button",{name:"Chart setup"})).toHaveAttribute("aria-expanded","true");
  await page.locator(".studio-destinations").getByRole("button",{name:"Overview"}).click();
  await page.getByRole("button",{name:"Drawing tools"}).click();
  await expect(page.getByRole("tabpanel",{name:"Objects"})).toBeVisible();
});
