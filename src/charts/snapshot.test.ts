import {describe,expect,it} from "vitest";
import {snapshotAttribution,snapshotFilename} from "./snapshot";

describe("source-qualified chart snapshots",()=>{
  it("preserves the symbol, interval and source in filenames",()=>{
    expect(snapshotFilename("EURUSD","1h","demo")).toBe("market-terminal-EURUSD-demo-1h.png");
    expect(snapshotFilename("BTCUSDT","1s","binance")).toBe("market-terminal-BTCUSDT-binance-1s.png");
  });
  it("never labels a synthetic snapshot as exchange data",()=>{
    expect(snapshotAttribution("AAPL","1d","demo")).toContain("SYNTHETIC");
    expect(snapshotAttribution("BTCUSDT","1m","binance")).toContain("BINANCE PUBLIC SPOT");
    expect(snapshotAttribution("EURUSD","1h","demo")).not.toContain("BINANCE");
  });
});
