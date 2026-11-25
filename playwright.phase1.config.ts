import {defineConfig,devices} from "@playwright/test";

/** Fast cross-browser and responsive smoke gate; full Chromium regression
 * suite still runs separately in playwright.config.ts. */
export default defineConfig({
  testDir:"./e2e",
  testMatch:"phase1-smoke.spec.ts",
  timeout:60_000,
  expect:{timeout:12_000},
  retries:process.env.CI?1:0,
  workers:1,
  reporter:"list",
  projects:[
    {name:"firefox",use:{...devices["Desktop Firefox"],viewport:{width:1440,height:900}}},
    {name:"webkit",use:{...devices["Desktop Safari"],viewport:{width:1440,height:900}}},
    {name:"mobile-chromium",use:{...devices["Pixel 7"],browserName:"chromium"}},
    {name:"mobile-webkit",use:{...devices["iPhone 13"],browserName:"webkit"}}
  ],
  use:{
    baseURL:"http://127.0.0.1:4173",
    trace:"retain-on-failure",
    screenshot:"only-on-failure"
  },
  webServer:{
    command:"npm run build -- --mode e2e && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url:"http://127.0.0.1:4173/market-terminal/",
    reuseExistingServer:!process.env.CI,
    timeout:90_000
  }
});
