import type { Candle, MarketInterval } from "./contracts";
import { findTimeGaps, normalizeCandles } from "./contracts";

/**
 * Reconcile a fresh exchange REST window with candles already observed from the
 * live stream. A fresh *final* REST candle is authoritative; an older provisional
 * REST snapshot must never roll back a more recent live-stream update.
 *
 * The newest maxCandles are retained, so a long disconnection replaces outdated
 * history rather than leaving a misleading discontinuity between old and new data.
 */
export function mergeExchangeHistory(
  previous: readonly Candle[],
  history: readonly Candle[],
  maxCandles = 1000,
): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const candle of normalizeCandles(previous)) byTime.set(candle.openTimeMs, candle);
  for (const candle of normalizeCandles(history)) {
    const existing = byTime.get(candle.openTimeMs);
    if (!existing || candle.isFinal) {
      byTime.set(candle.openTimeMs, candle);
    }
  }
  return normalizeCandles([...byTime.values()]).slice(-Math.max(1, maxCandles));
}

/** Binance Spot trades continuously; omitted completed intervals indicate a hole. */
export function hasCandleGaps(candles: readonly Candle[], interval: MarketInterval): boolean {
  return findTimeGaps(candles, interval).length > 0;
}
