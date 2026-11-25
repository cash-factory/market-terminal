import { describe, expect, it } from "vitest";
import { demoCandles, frameSeconds, sma, symbols, REAL_SPOT_SYMBOLS, type SymbolId, type Frame } from "./market";

describe("market demonstration fixture", () => {
  it("has valid ordered OHLC candles across markets and timeframes", () => {
    for (const symbol of Object.keys(symbols) as SymbolId[]) {
      for (const frame of Object.keys(frameSeconds) as Frame[]) {
        const candles = demoCandles(symbol, frame);
        expect(candles).toHaveLength(360);
        const seconds = frameSeconds[frame];
        for (let i = 0; i < candles.length; i++) {
          const c = candles[i];
          expect(Number(c.time) % seconds).toBe(0);
          expect(c.open).toBeGreaterThan(0);
          expect(c.close).toBeGreaterThan(0);
          expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
          expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
          if (i > 0) {
            expect(Number(c.time) - Number(candles[i - 1].time)).toBe(seconds);
          }
        }
      }
    }
  });

  it("produces the expected simple moving average", () => {
    const candles = demoCandles("AAPL", "1h");
    const average = sma(candles, 20);
    expect(average).toHaveLength(candles.length - 19);
    expect(average[0].time).toBe(candles[19].time);
    const expected = candles.slice(0, 20).reduce((sum, c) => sum + c.close, 0) / 20;
    expect(average[0].value).toBeCloseTo(expected, 8);
  });

  it("distinguishes verified venue instruments from provider-required markets", () => {
    for (const id of REAL_SPOT_SYMBOLS) {
      expect(symbols[id].market).toContain("BINANCE SPOT");
    }
    for (const id of ["XAUUSD", "US100"] as const) {
      expect(symbols[id].market).toContain("EXTERNAL CHARTS");
    }
    for (const id of ["EURUSD", "AAPL"] as const) {
      expect(symbols[id].market).toContain("PROVIDER REQUIRED");
    }
  });
});
