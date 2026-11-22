import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchBinanceSpotCandles, parseBinanceKlines } from "./binance";
import { findTimeGaps, normalizeCandles, type Candle } from "./contracts";

const fixture = (start: number, end: number) =>
  [start, "100.0", "108.0", "98.0", "104.0", "12.25", end, "0", 0, "0", "0", "0"];

afterEach(() => vi.unstubAllGlobals());

describe("source-aware OHLC normalization", () => {
  it("drops invalid data, deduplicates timestamps and returns ascending order", () => {
    const base: Candle = { openTimeMs: 60_000, open: 1, high: 2, low: 1, close: 2, isFinal: true };
    const normalized = normalizeCandles([
      { ...base, openTimeMs: 120_000 },
      base,
      { ...base, openTimeMs: 120_000, close: 1.4 },
      { ...base, openTimeMs: 180_000, high: 0 },
      { ...base, openTimeMs: 240_000, close: Number.NaN },
    ]);
    expect(normalized.map(c => c.openTimeMs)).toEqual([60_000, 120_000]);
    expect(normalized[1].close).toBe(1.4);
  });
  it("detects missing intervals for a continuously traded market", () => {
    const rows: Candle[] = [0, 60_000, 240_000].map(openTimeMs => ({
      openTimeMs, open: 1, high: 1, low: 1, close: 1, isFinal: true
    }));
    expect(findTimeGaps(rows, "1m")).toEqual([{ afterMs: 60_000, barsMissing: 2 }]);
  });
});

describe("Binance public historical adapter", () => {
  it("reads public spot candle arrays and detects provisional candles", () => {
    expect(parseBinanceKlines([fixture(60_000, 119_999), fixture(120_000, 179_999)], 150_000))
      .toMatchObject([
        { openTimeMs: 60_000, close: 104, volume: 12.25, volumeType: "base", isFinal: true },
        { openTimeMs: 120_000, close: 104, isFinal: false }
      ]);
  });
  it("returns explicit exchange attribution and no redistribution permission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => [fixture(60_000, 119_999)]
    });
    vi.stubGlobal("fetch", fetchMock);
    const batch = await fetchBinanceSpotCandles({ interval: "1m" });
    expect(batch.instrument.id).toBe("CRYPTO:BINANCE:BTCUSDT:SPOT");
    expect(batch.attribution.isRedistributable).toBe(false);
    expect(batch.attribution.status).toBe("historical");
    expect(batch.candles).toHaveLength(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("symbol")).toBe("BTCUSDT");
    expect(url.searchParams.get("interval")).toBe("1m");
  });
  it("rejects invalid date ranges before sending network traffic", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchBinanceSpotCandles({ interval: "1h", startTimeMs: 200, endTimeMs: 100 }))
      .rejects.toMatchObject({ code: "BAD_DATA" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not turn provider request limits into a fake successful feed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(fetchBinanceSpotCandles({ interval: "1d" }))
      .rejects.toMatchObject({ code: "RATE_LIMIT" });
  });
});
