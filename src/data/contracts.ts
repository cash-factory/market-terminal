/** Source-aware market-data contracts. No provider may silently masquerade as another venue. */
export const INTERVAL_MS = {
  "1s":1_000,"5s":5_000,"10s":10_000,"15s":15_000,"30s":30_000,"45s":45_000,
  "1m": 60_000,
  "5m": 300_000,
  "15m": 900_000,
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
} as const;

export type MarketInterval = keyof typeof INTERVAL_MS;
export type FeedStatus = "live" | "delayed" | "historical" | "synthetic" | "stale" | "offline";

export type Candle = {
  openTimeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  volumeType?: "base" | "quote" | "tick";
  isFinal: boolean;
};

export type InstrumentIdentity = {
  id: string;
  assetClass: "forex" | "crypto" | "equity" | "cash-index" | "index-cfd";
  venue: string;
  providerId: string;
  providerSymbol: string;
  quoteCurrency: string;
  tickSize: number | null;
};

export type FeedAttribution = {
  providerId: string;
  venue: string;
  displayName: string;
  status: FeedStatus;
  isRedistributable: boolean;
  asOfMs: number | null;
  disclaimer?: string;
};

export type CandleBatch = {
  instrument: InstrumentIdentity;
  interval: MarketInterval;
  candles: Candle[];
  attribution: FeedAttribution;
};

export class MarketDataError extends Error {
  constructor(public readonly code: "NETWORK" | "BAD_DATA" | "RATE_LIMIT" | "UNSUPPORTED" | "CANCELLED", message: string) {
    super(message);
    this.name = "MarketDataError";
  }
}

/** Normalize provider candles and drop corrupt, non-finite and duplicate timestamps. Last valid record wins. */
export function normalizeCandles(input: readonly Candle[]): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const row of input) {
    if (!Number.isSafeInteger(row.openTimeMs) || row.openTimeMs < 0) continue;
    if (![row.open, row.high, row.low, row.close].every(n => Number.isFinite(n) && n > 0)) continue;
    if (row.high < Math.max(row.open, row.close) || row.low > Math.min(row.open, row.close) || row.low > row.high) continue;
    if (row.volume !== undefined && (!Number.isFinite(row.volume) || row.volume < 0)) continue;
    byTime.set(row.openTimeMs, { ...row });
  }
  return [...byTime.values()].sort((a, b) => a.openTimeMs - b.openTimeMs);
}

/** Missing bars are only suspicious for continuously-traded markets; exchange calendars need separate handling. */
export function findTimeGaps(candles: readonly Candle[], interval: MarketInterval): { afterMs: number; barsMissing: number }[] {
  const expectedMs = INTERVAL_MS[interval];
  const gaps: { afterMs: number; barsMissing: number }[] = [];
  for (let i = 1; i < candles.length; i++) {
    const gap = candles[i].openTimeMs - candles[i - 1].openTimeMs;
    if (gap > expectedMs) gaps.push({
      afterMs: candles[i - 1].openTimeMs,
      barsMissing: Math.max(0, Math.floor(gap / expectedMs) - 1)
    });
  }
  return gaps;
}
