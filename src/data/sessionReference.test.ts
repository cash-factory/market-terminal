import {describe,expect,it} from "vitest";
import {easternWallClock,referenceMarketHours,priceMetadata} from "./sessionReference";

const utc=(value:string)=>Date.parse(value);
describe("market-hours references are informational and DST-aware",()=>{
  it("interprets Nasdaq core session according to New York DST rather than UTC offset guesses",()=>{
    const winter=easternWallClock(utc("2026-03-06T14:30:00Z"));
    const summer=easternWallClock(utc("2026-03-09T13:30:00Z"));
    expect(winter?.minuteOfDay).toBe(9*60+30);
    expect(summer?.minuteOfDay).toBe(9*60+30);
    expect(referenceMarketHours("AAPL","demo",utc("2026-03-09T13:30:00Z")).summary)
      .toMatch(/Inside Nasdaq/);
    expect(referenceMarketHours("AAPL","demo",utc("2026-03-06T14:29:00Z")).summary)
      .toMatch(/Outside Nasdaq/);
  });
  it("respects official 2026 Nasdaq holiday and 13:00 ET early closes",()=>{
    const holiday=referenceMarketHours("AAPL","demo",utc("2026-07-03T15:00:00Z"));
    expect(holiday).toMatchObject({calendarStatus:"closed",isExecutionAvailabilityConfirmed:false});
    expect(holiday.summary).toMatch(/holiday/);
    const before=referenceMarketHours("AAPL","demo",utc("2026-11-27T17:59:00Z"));
    const after=referenceMarketHours("AAPL","demo",utc("2026-11-27T18:00:00Z"));
    expect(before).toMatchObject({calendarStatus:"early-close"});
    expect(before.summary).toMatch(/Inside Nasdaq/);
    expect(after.summary).toMatch(/Early-close day/);
    expect(referenceMarketHours("AAPL","demo",utc("2026-11-22T12:00:00Z")).summary)
      .toMatch(/Weekend/);
    expect(referenceMarketHours("AAPL","demo",utc("2027-01-04T15:00:00Z")).calendarStatus)
      .toBe("unknown");
  });
  it("does not invent broker contracts, CFD calendars or executable live status",()=>{
    for(const symbol of ["EURUSD","US100"] as const){
      const hours=referenceMarketHours(symbol,"demo",utc("2026-11-20T15:00:00Z"));
      expect(hours).toMatchObject({calendarStatus:"unknown",isExecutionAvailabilityConfirmed:false});
      expect(priceMetadata(symbol,"demo").tickSize).toBeNull();
    }
    const crypto=referenceMarketHours("BTCUSDT","binance",utc("2026-11-22T15:00:00Z"));
    expect(crypto).toMatchObject({
      calendarStatus:"continuous-reference",isExecutionAvailabilityConfirmed:false
    });
    expect(priceMetadata("BTCUSDT","binance")).toMatchObject({
      displayDecimals:2,tickSize:null,venueVerified:false
    });
  });
  it("rejects dates outside the supported time range gracefully",()=>{
    expect(easternWallClock(Number.NaN)).toBeNull();
    expect(easternWallClock(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
