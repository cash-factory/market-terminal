import {expect,test} from "@playwright/test";
import {mkdirSync} from "node:fs";

test("default workstation is restrained, usable and image-free",async({page})=>{
  await page.setViewportSize({width:1366,height:768});
  await page.goto("/market-terminal/");
  const app=page.locator(".app.studio");
  await expect(app).toBeVisible();
  await expect(page.locator(".instrument-header")).toHaveCSS("background-image","none");
  await expect(page.locator(".studio .branding .logo")).toHaveCSS("box-shadow","none");
  await expect(page.getByRole("button",{name:"Choose chart instrument"})).toBeVisible();

  await page.getByRole("button",{name:"Open Trend & channels tools"}).click();
  const library=page.getByRole("group",{name:"Advanced drawing tools"});
  await expect(library).toBeVisible();
  await expect(library).toHaveCSS("border-radius","7px");
  await expect(library).toHaveCSS("background-image","none");
  await expect(library.getByRole("button",{name:"Regression channel",exact:true})).toBeVisible();

  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/institutional-workstation-desktop.png",animations:"disabled"});
});

test("workstation finish keeps usable mobile and light-mode surfaces",async({page})=>{
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
  expect(overflow).toBeLessThanOrEqual(2);
  mkdirSync("test-results/review",{recursive:true});
  await page.screenshot({path:"test-results/review/institutional-workstation-mobile-light.png",animations:"disabled"});
});
