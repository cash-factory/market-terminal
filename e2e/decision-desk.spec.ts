import { expect, test } from "@playwright/test";

test("Decision Desk captures, reviews and restores source-aware decisions", async ({page}) => {
  await page.goto("/market-terminal/");
  await page.getByRole("button", {name:"Capture decision"}).click();
  await expect(page.getByRole("heading",{name:"Decision Desk."})).toBeVisible();
  await expect(page.getByText("Synthetic / demonstration").first()).toBeVisible();
  await page.getByRole("textbox",{name:"Decision thesis"}).fill("The range may expand after a confirmed break");
  await page.getByRole("textbox",{name:"Decision confirmation"}).fill("A close above the previous range high");
  await page.getByRole("textbox",{name:"Decision invalidation"}).fill("Close back inside the range");
  await page.getByRole("button",{name:"Lock the observation"}).click();
  await expect(page.getByRole("heading",{name:"Original reasoning"})).toBeVisible();
  await expect(page.getByText("The range may expand after a confirmed break").last()).toBeVisible();
  await page.getByRole("combobox",{name:"Plan adherence"}).selectOption("changed");
  await page.getByRole("combobox",{name:"Market outcome"}).selectOption("invalidated");
  await page.getByRole("textbox",{name:"Review notes"}).fill("The break reversed before confirmation");
  await page.getByRole("button",{name:"Append review"}).click();
  await expect(page.getByText("The break reversed before confirmation")).toBeVisible();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem("market-terminal-workspace")??"{}"));
  expect(stored.version).toBe(24);
  expect(stored.preferences.decisions).toHaveLength(1);
  expect(stored.preferences.decisions[0].reviews).toHaveLength(1);
  expect(stored.preferences.decisions[0].snapshot.barsVisible).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole("button",{name:"Decision Desk",exact:true}).click();
  await page.getByRole("button",{name:/The range may expand after a confirmed break/}).click();
  await expect(page.getByText("The break reversed before confirmation")).toBeVisible();
  await expect(page.getByText("Close back inside the range")).toBeVisible();
  await page.getByRole("button",{name:"Open current chart"}).click();
  await expect(page.getByRole("button",{name:"Capture decision"})).toBeVisible();
});

test("Decision Desk remains usable on narrow mobile viewports", async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Decision Desk",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"Decision thesis"})).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});
