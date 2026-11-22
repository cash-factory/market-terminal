import { describe, expect, it } from "vitest";
import { hasCandleGaps, mergeExchangeHistory } from "./reconciliation";
import type { Candle } from "./contracts";

const bar = (minute: number, close: number, isFinal = true): Candle => ({
  openTimeMs: minute * 60_000,
  open: 100,
  high: Math.max(110, close),
  low: Math.min(90, close),
  close,
  isFinal,
});

describe("exchange history reconciliation", () => {
  it("repairs a disconnection hole using REST backfill", () => {
    const before = [bar(1, 101), bar(2, 102), bar(6, 106, false)];
    expect(hasCandleGaps(before, "1m")).toBe(true);
    const repaired = mergeExchangeHistory(before, [
      bar(2, 102), bar(3, 103), bar(4, 104), bar(5, 105), bar(6, 104, false),
    ]);
    expect(repaired.map(c => c.openTimeMs / 60_000)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(repaired.at(-1)?.close).toBe(106); // newer stream provisional wins
    expect(hasCandleGaps(repaired, "1m")).toBe(false);
  });

  it("allows confirmed REST corrections to replace provisional stream candles", () => {
    const result = mergeExchangeHistory([bar(4, 108, false)], [bar(4, 109, true)]);
    expect(result).toEqual([bar(4, 109, true)]);
  });

  it("allows finalized exchange corrections and does not downgrade finality", () => {
    expect(mergeExchangeHistory([bar(4, 108, true)], [bar(4, 109, true)]))
      .toEqual([bar(4, 109, true)]);
    expect(mergeExchangeHistory([bar(4, 108, true)], [bar(4, 107, false)]))
      .toEqual([bar(4, 108, true)]);
  });

  it("keeps the newest bounded history after an extended outage", () => {
    const old = Array.from({length: 1000}, (_, i) => bar(i, 101));
    const current = Array.from({length: 1000}, (_, i) => bar(i + 2000, 102));
    const result = mergeExchangeHistory(old, current, 1000);
    expect(result).toHaveLength(1000);
    expect(result[0].openTimeMs).toBe(2000 * 60_000);
    expect(result.at(-1)?.openTimeMs).toBe(2999 * 60_000);
    expect(hasCandleGaps(result, "1m")).toBe(false);
  });

  it("sorts and drops invalid duplicate candles instead of trusting network order", () => {
    const result = mergeExchangeHistory([bar(1, 101)], [
      bar(3, 103), bar(2, 102), {...bar(3, 110), close: Number.NaN},
    ]);
    expect(result.map(row => row.close)).toEqual([101, 102, 103]);
  });
});
