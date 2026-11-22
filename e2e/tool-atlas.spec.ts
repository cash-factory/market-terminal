import {test,expect} from "@playwright/test";

test("Tool Atlas executes drawing and research commands with keyboard navigation",async({page})=>{
  await page.goto("/market-terminal/");
  await page.keyboard.press("Control+k");
  const search=page.getByRole("combobox",{name:"Search instruments and tools"});
  await expect(search).toBeFocused();
  await search.fill("Fibonacci");
  await expect(page.getByRole("option",{name:/Fibonacci Levels/})).toBeVisible();
  await search.press("Enter");
  await expect(page.getByRole("button",{name:"Open Fib / Gann tools"})).toHaveClass(/armed/);
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox",{name:"Search instruments and tools"}).fill("Decision Desk");
  await page.getByRole("combobox",{name:"Search instruments and tools"}).press("Enter");
  await expect(page.getByRole("heading",{name:"Decision Desk."})).toBeVisible();
});

test("Tool Atlas reports unavailable tools honestly and supports mobile keyboard interaction",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.keyboard.press("Control+k");
  const search=page.getByRole("combobox",{name:"Search instruments and tools"});
  await search.fill("broker execution");
  await expect(page.getByText("No matching tools or instruments")).toBeVisible();
  await search.fill("risk planner");
  await search.press("Enter");
  await expect(page.getByRole("heading",{name:/risk/i}).first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
});
