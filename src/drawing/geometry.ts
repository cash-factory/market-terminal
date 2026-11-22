import type { UTCTimestamp } from "lightweight-charts";
import type { CandlestickData } from "lightweight-charts";

/**
 * Candle timestamps represent the UTC open of each bar. Convert pointer positions
 * using the chart's actual logical scale, not the browser's pixel/time assumptions.
 *
 * Uniform time spacing is valid for the current continuous demo/Binance feeds.
 * Exchange-calendar-aware (gapped) markets will need a different calendar mapper.
 */
export function timeFromLogical(
  logical: number,
  candles: readonly CandlestickData<UTCTimestamp>[],
  fallbackStepSeconds: number,
): number | null {
  if (!Number.isFinite(logical) || candles.length === 0) return null;
  const step = intervalSeconds(candles, fallbackStepSeconds);
  const candidate = Number(candles[0].time) + logical * step;
  return Number.isSafeInteger(Math.round(candidate)) && candidate >= 0 ? Math.round(candidate) : null;
}

export function logicalFromTime(
  timestamp: number,
  candles: readonly CandlestickData<UTCTimestamp>[],
  fallbackStepSeconds: number,
): number | null {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || !candles.length) return null;
  const step = intervalSeconds(candles, fallbackStepSeconds);
  const logical = (timestamp - Number(candles[0].time)) / step;
  return Number.isFinite(logical) ? logical : null;
}

export function intervalSeconds(
  candles: readonly CandlestickData<UTCTimestamp>[],
  fallbackStepSeconds: number,
): number {
  if (candles.length >= 2) {
    const sample = Number(candles[1].time) - Number(candles[0].time);
    if (Number.isFinite(sample) && sample > 0) return sample;
  }
  return fallbackStepSeconds > 0 ? fallbackStepSeconds : 60;
}

export type ChartPoint = { x: number; y: number };

export function pointerDistance(from: ChartPoint, to: ChartPoint): number {
  return Math.hypot(from.x - to.x, from.y - to.y);
}

export function inChartPlot(point: ChartPoint, plotWidth: number, plotHeight: number): boolean {
  return point.x >= 0 && point.x < plotWidth && point.y >= 0 && point.y < plotHeight;
}
