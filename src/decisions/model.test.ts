import { describe, expect, it } from "vitest";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { appendDecisionReview, captureDecision, decisionMetrics, parseDecisionRecords } from "./model";

const bar = (second: number, close = 103): CandlestickData<UTCTimestamp> => ({
  time: second as UTCTimestamp, open: 100, high: 108, low: 98, close
});
const context = {
  symbol: "BTCUSDT" as const, frame: "1m" as const,
  source: "binance" as const, feedStatus: "live" as const,
  replay: false, visibleCandles: [bar(60), bar(120)],
};
const setup = {
  direction: "wait" as const,
  thesis: "  Trend may continue  ",
  trigger: "Confirmed close above the range",
  invalidation: "Sustained move below the range",
};

describe("Decision Desk: provenance and durable analysis", () => {
  it("captures only visible replay candles, never the future live candle", () => {
    const replay = captureDecision(
      { ...context, replay: true, feedStatus: "historical",
        visibleCandles: [bar(60)] },
      setup, "first", 180000,
    );
    expect(replay.snapshot).toMatchObject({barTimeMs: 60000, close: 103, barsVisible: 1});
    expect(replay.replay).toBe(true);
    expect(replay.setup.thesis).toBe("Trend may continue");
    expect(replay.source).toBe("binance");
    expect(replay.feedStatus).toBe("historical");
  });

  it("refuses missing, future and malformed observed candles", () => {
    expect(() => captureDecision({...context, visibleCandles: []}, setup, "bad", 180000))
      .toThrow(/observed candle/i);
    expect(() => captureDecision({...context, visibleCandles: [bar(240)]}, setup, "bad", 180000))
      .toThrow(/future/i);
    expect(() => captureDecision({...context, visibleCandles: [bar(60, 111)]}, setup, "bad", 180000))
      .toThrow(/invalid/i);
    expect(() => captureDecision(context, {...setup, invalidation: " "}, "bad", 180000))
      .toThrow(/complete/i);
  });

  it("keeps the original plan and candle immutable through subsequent reviews", () => {
    const first = captureDecision(context, setup, "original", 180000);
    const revised = appendDecisionReview(first,
      { adherence:"changed", outcome:"invalidated", note:"Changed criteria during review" },
      "review1", 240000);
    const revisedTwice = appendDecisionReview(revised,
      { adherence:"followed", outcome:"unresolved", note:"Additional context" },
      "review2", 300000);
    expect(first.reviews).toEqual([]);
    expect(revised.reviews).toHaveLength(1);
    expect(revisedTwice.reviews).toHaveLength(2);
    expect(revisedTwice.snapshot).toEqual(first.snapshot);
    expect(revisedTwice.setup).toEqual(first.setup);
    expect(() => appendDecisionReview(first,
      { adherence:"changed", outcome:"unresolved", note:"" }, "invalid", 240000))
      .toThrow(/describe what changed/i);
  });

  it("round-trips strict workspace import while ignoring unsafe or corrupted records", () => {
    const clean = captureDecision(context, setup, "one", 180000);
    expect(parseDecisionRecords(JSON.parse(JSON.stringify([clean])))).toEqual([clean]);
    expect(parseDecisionRecords([clean, {...clean, id:"two", source:"binance", symbol:"EURUSD"}]))
      .toHaveLength(1);
    expect(parseDecisionRecords([clean, {...clean, id:"one", snapshot:{...clean.snapshot, close:NaN}}]))
      .toHaveLength(1);
    expect(parseDecisionRecords([{...clean, id:"broken", setup:{...setup, trigger:""}}]))
      .toHaveLength(0);
    expect(decisionMetrics([clean])).toEqual({recorded:1, reviewed:0, awaitingReview:1});
  });
});
