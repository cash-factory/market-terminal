import { describe, expect, it } from "vitest";
import { parseBinanceStreamCandle, mergeStreamCandle } from "./stream";
import type { Candle } from "./contracts";
import { defaultWorkspace, parseWorkspace, serializeWorkspace } from "../workspace";

const candle = (timestamp: number, close = 100, isFinal = false): Candle => ({
  openTimeMs: timestamp, open: 100, high: 110, low: 90, close,
  volume: 3, volumeType: "base", isFinal
});
const message = (t: number, interval = "1m", close = "102", final = false) => ({
  e: "kline", s: "BTCUSDT",
  k: { t, T: t + 59_999, s: "BTCUSDT", i: interval,
    o: "100", h: "110", l: "90", c: close, v: "3.2", x: final }
});
describe("Binance Spot stream validation", () => {
  it("validates exact source, interval, numbers and final flag", () => {
    expect(parseBinanceStreamCandle(message(60_000), "1m"))
      .toMatchObject({ openTimeMs: 60_000, close: 102, isFinal: false, volumeType: "base" });
    expect(parseBinanceStreamCandle({...message(60_000), s: "ETHUSDT"}, "1m")).toBeNull();
    expect(parseBinanceStreamCandle(message(60_000, "5m"), "1m")).toBeNull();
    expect(parseBinanceStreamCandle(message(60_000, "1m", "Infinity"), "1m")).toBeNull();
    expect(parseBinanceStreamCandle(message(60_000, "1m", "115"), "1m")).toBeNull();
  });
  it("merges newer candles and refuses to downgrade a finalized bar", () => {
    const candles = [candle(60_000), candle(120_000, 103, true)];
    expect(mergeStreamCandle(candles, candle(120_000, 101, false))[1].close).toBe(103);
    const merged = mergeStreamCandle(candles, candle(180_000, 105, false));
    expect(merged).toHaveLength(3);
    expect(merged[2].close).toBe(105);
  });
  it("stores no more than the chosen bounded REST history window", () => {
    const many = Array.from({length: 1200}, (_, index) => candle(index * 60_000));
    const result = mergeStreamCandle(many, candle(1200 * 60_000), 1000);
    expect(result).toHaveLength(1000);
    expect(result[0].openTimeMs).toBe(201 * 60_000);
  });
});
describe("price-source workspace separation", () => {
  it("persists a real-source choice only for BTCUSDT and keeps demo by default", () => {
    const live = { ...defaultWorkspace, symbol: "BTCUSDT" as const, priceSource: "binance" as const };
    expect(parseWorkspace(JSON.parse(serializeWorkspace(live))).priceSource).toBe("binance");
    expect(parseWorkspace({symbol: "EURUSD", priceSource: "binance"}).priceSource).toBe("demo");
  });
  it("keeps legacy drawings and level objects compatible", () => {
    const old = { ...defaultWorkspace, levels: [
      {id:"original",symbol:"BTCUSDT" as const,price:120,color:"#112233"}
    ]};
    expect(parseWorkspace(JSON.parse(serializeWorkspace(old))).levels).toEqual(old.levels);
  });
  it("rejects malformed source fields when importing drawing objects", () => {
    const raw = parseWorkspace({ drawings: [
      { id:"bad", symbol:"BTCUSDT", tool:"trendline", color:"#123456", locked:false, source:"javascript",
        start: {time:10,price:100},end: {time:20,price:101} }
    ]});
    expect(raw.drawings).toEqual([]);
  });
});
