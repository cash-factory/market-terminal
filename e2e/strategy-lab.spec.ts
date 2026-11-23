import {test,expect} from "@playwright/test";

test("strategy laboratory computes deterministic equity and cost metrics",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("navigation",{name:"Workstation pages"})
    .getByRole("button",{name:"Strategy Lab"}).click();
  const lab=page.getByRole("main",{name:"Strategy laboratory"});
  await expect(lab.getByRole("heading",{name:"Strategy Laboratory"})).toBeVisible();
  await expect(lab.getByRole("img",{name:"Simulated equity curve"})).toBeVisible();
  await expect(lab.getByText("SYNTHETIC DATA")).toBeVisible();
  await expect(lab.getByText("Closed trades")).toBeVisible();
  await lab.getByRole("spinbutton",{name:"Fast SMA"}).fill("4");
  await lab.getByRole("spinbutton",{name:"Slow SMA"}).fill("13");
  await expect(lab.getByRole("img",{name:"Simulated equity curve"})).toBeVisible();
  await lab.getByRole("spinbutton",{name:"Starting capital"}).fill("20000");
  await expect(lab.getByText(/starting 20,000/)).toBeVisible();
  await lab.getByRole("spinbutton",{name:"Commission (bps / side)"}).fill("25");
  await expect(lab.getByText("Fees charged")).toBeVisible();
  await lab.getByRole("button",{name:"Reset strategy parameters"}).click();
  await expect(lab.getByRole("spinbutton",{name:"Fast SMA"})).toHaveValue("9");
  await expect(lab.getByRole("spinbutton",{name:"Slow SMA"})).toHaveValue("21");
});

test("strategy laboratory rejects unbounded or impossible inputs",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("navigation",{name:"Workstation pages"})
    .getByRole("button",{name:"Strategy Lab"}).click();
  const lab=page.getByRole("main",{name:"Strategy laboratory"});
  await lab.getByRole("spinbutton",{name:"Fast SMA"}).fill("90");
  await expect(lab.getByRole("alert")).toContainText("Slow moving average must exceed fast");
  await expect(lab.getByRole("img",{name:"Simulated equity curve"})).toHaveCount(0);
  await lab.getByRole("spinbutton",{name:"Fast SMA"}).fill("9");
  await expect(lab.getByRole("alert")).toHaveCount(0);
  await expect(lab.getByRole("img",{name:"Simulated equity curve"})).toBeVisible();
});

test("strategy laboratory navigates back to chart without trading",async({page})=>{
  await page.goto("/market-terminal/");
  await page.getByRole("navigation",{name:"Workstation pages"})
    .getByRole("button",{name:"Strategy Lab"}).click();
  await page.getByRole("main",{name:"Strategy laboratory"})
    .getByRole("button",{name:"Chart Studio"}).click();
  await expect(page.locator("svg.drawing-overlay")).toBeVisible();
  await expect(page.getByRole("main",{name:"Strategy laboratory"})).toHaveCount(0);
});
