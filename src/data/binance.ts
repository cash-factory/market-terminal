import {
  type Candle, type CandleBatch, type InstrumentIdentity, type MarketInterval,
  MarketDataError, normalizeCandles
} from "./contracts";

const ENDPOINT = "https://data-api.binance.vision/api/v3/klines";
const BINANCE_NATIVE_INTERVALS=new Set<MarketInterval>(["1s","1m","5m","15m","1h","4h","1d"]);

/** Binance's public REST feed. This is exchange spot data, not a CFD or a synthetic index. */
export const BTC_USDT_SPOT: InstrumentIdentity = {
  id: "CRYPTO:BINANCE:BTCUSDT:SPOT",
  assetClass: "crypto",
  venue: "Binance Spot",
  providerId: "binance-public",
  providerSymbol: "BTCUSDT",
  quoteCurrency: "USDT",
  tickSize: 0.01,
};

/** Convert an API row to a candle without trusting arbitrary provider response data. */
export function parseBinanceKlines(value: unknown, nowMs: number = Date.now()): Candle[] {
  if (!Array.isArray(value)) throw new MarketDataError("BAD_DATA", "Provider returned an invalid candle response.");
  if (value.length && !Array.isArray(value[0])) throw new MarketDataError("BAD_DATA", "Expected exchange candle arrays.");
  const rows: Candle[] = [];
  for (const raw of value) {
    if (!Array.isArray(raw) || raw.length < 7) continue;
    const time = Number(raw[0]);
    const open = Number(raw[1]), high = Number(raw[2]), low = Number(raw[3]), close = Number(raw[4]);
    const volume = Number(raw[5]);
    if (typeof raw[0] !== "number" || !Number.isSafeInteger(time) || time < 0) continue;
    if (typeof raw[1] !== "string" || typeof raw[2] !== "string" || typeof raw[3] !== "string" || typeof raw[4] !== "string") continue;
    if (typeof raw[5] !== "string" || typeof raw[6] !== "number") continue;
    rows.push({ openTimeMs: time, open, high, low, close, volume, volumeType: "base", isFinal: Number(raw[6]) < nowMs });
  }
  return normalizeCandles(rows);
}

export interface BinanceFetchOptions {
  symbol?: "BTCUSDT";
  interval: MarketInterval;
  startTimeMs?: number;
  endTimeMs?: number;
  signal?: AbortSignal;
}

/** Fetch a single exchange-limited batch (at most 1,000 candles). Uses no API key. */
export async function fetchBinanceSpotCandles(options: BinanceFetchOptions): Promise<CandleBatch> {
  if (options.symbol && options.symbol !== "BTCUSDT") throw new MarketDataError("UNSUPPORTED", "Only BTCUSDT is enabled in the initial Binance adapter.");
  if(!BINANCE_NATIVE_INTERVALS.has(options.interval))throw new MarketDataError("UNSUPPORTED","This is a derived seconds interval; request Binance native 1s candles and aggregate them locally.");
  const url = new URL(ENDPOINT);
  url.searchParams.set("symbol", "BTCUSDT");
  url.searchParams.set("interval", options.interval);
  url.searchParams.set("limit", "1000");
  if (options.startTimeMs !== undefined) {
    if (!Number.isSafeInteger(options.startTimeMs) || options.startTimeMs < 0) throw new MarketDataError("BAD_DATA", "Invalid start time.");
    url.searchParams.set("startTime", String(options.startTimeMs));
  }
  if (options.endTimeMs !== undefined) {
    if (!Number.isSafeInteger(options.endTimeMs) || options.endTimeMs < 0) throw new MarketDataError("BAD_DATA", "Invalid end time.");
    url.searchParams.set("endTime", String(options.endTimeMs));
  }
  if (options.startTimeMs !== undefined && options.endTimeMs !== undefined && options.endTimeMs < options.startTimeMs) {
    throw new MarketDataError("BAD_DATA", "End time must not precede start time.");
  }
  let response: Response;
  try { response = await fetch(url, { signal: options.signal }); }
  catch (error) {
    if (options.signal?.aborted) throw new MarketDataError("CANCELLED", "Market-data request cancelled.");
    throw new MarketDataError("NETWORK", error instanceof Error ? error.message : "Market-data request failed.");
  }
  if (response.status === 429 || response.status === 418) throw new MarketDataError("RATE_LIMIT", "Exchange request limit reached.");
  if (!response.ok) throw new MarketDataError("NETWORK", "Market-data provider returned HTTP " + response.status + ".");
  let payload: unknown;
  try { payload = await response.json(); } catch { throw new MarketDataError("BAD_DATA", "Provider did not return valid JSON."); }
  const candles = parseBinanceKlines(payload);
  return {
    instrument: BTC_USDT_SPOT,
    interval: options.interval,
    candles,
    attribution: {
      providerId: BTC_USDT_SPOT.providerId,
      venue: BTC_USDT_SPOT.venue,
      displayName: "Binance Public Spot API",
      status: "historical",
      isRedistributable: false,
      asOfMs: candles.length ? candles[candles.length - 1].openTimeMs : null,
      disclaimer: "Direct provider read only. Live/redistribution permissions depend on applicable exchange terms.",
    }
  };
}
