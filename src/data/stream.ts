import type { Candle, MarketInterval } from "./contracts";
import { normalizeCandles } from "./contracts";

type RecordLike = Record<string, unknown>;
const asRecord = (value: unknown): RecordLike | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordLike : null;

/** Accept only Binance Spot's BTCUSDT kline payload for the exact requested UTC interval. */
export function parseBinanceStreamCandle(message: unknown, interval: MarketInterval): Candle | null {
  const envelope = asRecord(message);
  const body = asRecord(envelope?.data) ?? envelope;
  if (!body || body.e !== "kline" || body.s !== "BTCUSDT") return null;
  const kline = asRecord(body.k);
  if (!kline || kline.s !== "BTCUSDT" || kline.i !== interval || typeof kline.t !== "number" ||
      typeof kline.T !== "number" || typeof kline.x !== "boolean") return null;
  if (!["o","h","l","c","v"].every(key => typeof kline[key] === "string")) return null;
  const candidate: Candle = {
    openTimeMs: kline.t,
    open: Number(kline.o), high: Number(kline.h),
    low: Number(kline.l), close: Number(kline.c),
    volume: Number(kline.v), volumeType: "base", isFinal: kline.x,
  };
  return normalizeCandles([candidate])[0] ?? null;
}

/**
 * Reconcile a public kline stream with an initial REST snapshot.
 * Do not overwrite a finalized candle with an older provisional event.
 * Preserve a bounded in-memory history rather than writing market ticks to the backend.
 */
export function mergeStreamCandle(previous: readonly Candle[], incoming: Candle, maxCandles = 1000): Candle[] {
  const existing = previous.find(row => row.openTimeMs === incoming.openTimeMs);
  if (existing?.isFinal && !incoming.isFinal) return [...previous];
  const updated = normalizeCandles([...previous.filter(row => row.openTimeMs !== incoming.openTimeMs), incoming]);
  return updated.slice(-maxCandles);
}
