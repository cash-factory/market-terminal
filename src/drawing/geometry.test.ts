import { describe, expect, it } from "vitest";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { inChartPlot, logicalFromTime, pointerDistance, timeFromLogical } from "./geometry";

const asCandle = (time: number): CandlestickData<UTCTimestamp> => ({
  time: time as UTCTimestamp, open: 100, high: 105, low: 95, close: 102
});

describe("drawing pointer geometry", () => {
  it("converts logical chart coordinates to valid UTC anchors anywhere within plot", () => {
    const candles = [asCandle(1000), asCandle(1060), asCandle(1120)];
    expect(timeFromLogical(0, candles, 60)).toBe(1000);
    expect(timeFromLogical(0.5, candles, 60)).toBe(1030);
    expect(timeFromLogical(2.5, candles, 60)).toBe(1150);
    expect(timeFromLogical(-1, candles, 60)).toBe(940);
    expect(logicalFromTime(1150, candles, 60)).toBe(2.5);
    expect(timeFromLogical(Number.NaN, candles, 60)).toBeNull();
  });

  it("keeps timestamps stable when switching chart timeframes", () => {
    const minuteCandles = [asCandle(1_800_000_000), asCandle(1_800_000_060)];
    const hourlyCandles = [asCandle(1_800_000_000), asCandle(1_800_003_600)];
    const originalTime = timeFromLogical(0.5, minuteCandles, 60);
    expect(originalTime).toBe(1_800_000_030);
    const logicalAtHour = logicalFromTime(originalTime!, hourlyCandles, 3600);
    expect(logicalAtHour).toBeCloseTo(30 / 3600, 10);
    expect(timeFromLogical(logicalAtHour!, hourlyCandles, 3600)).toBe(originalTime);
  });

  it("rejects clicks on the price and time scales, not in the drawing plot", () => {
    expect(inChartPlot({x: 300,y: 200}, 800, 400)).toBe(true);
    expect(inChartPlot({x: 810,y: 200}, 800, 400)).toBe(false);
    expect(inChartPlot({x: 300,y: 410}, 800, 400)).toBe(false);
    expect(inChartPlot({x: -5,y: 100}, 800, 400)).toBe(false);
    expect(pointerDistance({x:10,y:20},{x:13,y:24})).toBe(5);
  });

  it("uses a fallback interval for a single candle and handles empty data safely", () => {
    const candle = [asCandle(1000)];
    expect(timeFromLogical(2, candle, 300)).toBe(1600);
    expect(logicalFromTime(1600, candle, 300)).toBe(2);
    expect(timeFromLogical(0, [], 300)).toBeNull();
    expect(logicalFromTime(1000, [], 300)).toBeNull();
  });
});
