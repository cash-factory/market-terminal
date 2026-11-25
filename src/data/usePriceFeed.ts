import { useEffect, useMemo, useState } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { demoCandles, ENABLE_TEST_FIXTURES, isRealSpotSymbol, isSecondsFrame, symbols, type Frame, type SymbolId, type RealSpotSymbol } from "../market";
import { aggregateSeconds } from "./seconds";
import { fetchBinanceSpotCandles } from "./binance";
import type { Candle } from "./contracts";
import { mergeStreamCandle, parseBinanceStreamCandle } from "./stream";

export type PriceSource = "demo" | "binance";
export type PriceStatus = "synthetic" | "loading" | "connecting" | "historical" | "live" | "stale" | "error";

interface FeedSnapshot {
  key: string;
  candles: Candle[];
  status: PriceStatus;
  message: string | null;
  asOfMs: number | null;
}

export type PriceFeed = {
  candles: CandlestickData<UTCTimestamp>[];
  status: PriceStatus;
  sourceLabel: string;
  message: string | null;
  lastUpdatedMs: number | null;
  retry: () => void;
};

function chartCandles(rows: readonly Candle[]): CandlestickData<UTCTimestamp>[] {
  return rows.map(row => ({
    time: (row.openTimeMs / 1000) as UTCTimestamp,
    open: row.open, high: row.high, low: row.low, close: row.close
  }));
}

const EMPTY_CANDLES: CandlestickData<UTCTimestamp>[] = [];
const STREAM_URL = "wss://data-stream.binance.vision:443/ws/";

/** Opt-in, browser-side market data: no secrets, no proxy and no synthetic-price fallback. */
export function usePriceFeed(symbol: SymbolId, interval: Frame, mode: PriceSource, enabled = true): PriceFeed {
  const demo = useMemo(() => ENABLE_TEST_FIXTURES ? demoCandles(symbol, interval) : EMPTY_CANDLES, [symbol, interval]);
  const [revision, setRevision] = useState(0);
  const key = symbol + ":" + interval + ":" + mode + ":" + revision;
  const [snapshot, setSnapshot] = useState<FeedSnapshot>({
    key: "", candles: [], status: "loading", message: null, asOfMs: null,
  });
  const active = enabled && mode === "binance" && isRealSpotSymbol(symbol);
  const nativeFrame:Frame = isSecondsFrame(interval) ? "1s" : interval;

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    const controller = new AbortController();
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let healthTimer: ReturnType<typeof setInterval> | null = null;
    let retries = 0;
    let receivedAt = 0;
    const begin = (status: PriceStatus, message: string | null, candles: Candle[] = [], asOfMs: number | null = null) => {
      if (!disposed) setSnapshot({key, status, message, candles, asOfMs});
    };
    begin("loading", "Loading Binance Spot candles…");

    const connect = () => {
      if (disposed) return;
      if (typeof WebSocket === "undefined") {
        setSnapshot(old => old.key !== key ? old : {
          ...old, status: "error", message: "This browser does not support live WebSocket streaming."
        });
        return;
      }
      try {
        socket = new WebSocket(STREAM_URL + symbol.toLowerCase() + "@kline_" + nativeFrame);
      } catch {
        scheduleRetry("Could not open the Binance WebSocket.");
        return;
      }
      socket.onopen = () => {
        retries = 0;
        if (!disposed) setSnapshot(old =>
          old.key === key ? {...old, status: "connecting", message: "Connected; waiting for first live candle update…"} : old
        );
      };
      socket.onmessage = event => {
        let parsed: unknown;
        try { parsed = JSON.parse(String(event.data)); } catch { return; }
        const candle = parseBinanceStreamCandle(parsed, nativeFrame, symbol as RealSpotSymbol);
        if (!candle || disposed) return;
        receivedAt = Date.now();
        setSnapshot(old => {
          if (old.key !== key) return old;
          return {
            ...old, candles: mergeStreamCandle(old.candles, candle),
            status: "live", message: null, asOfMs: receivedAt,
          };
        });
      };
      socket.onerror = () => {
        // The close event performs backoff; avoid misleading generic network errors here.
      };
      socket.onclose = () => {
        if (!disposed) scheduleRetry("Live stream disconnected. Reconnecting…");
      };
    };
    const scheduleRetry = (message: string) => {
      if (disposed || retryTimer !== null) return;
      setSnapshot(old => old.key === key ? {
        ...old, status: old.candles.length ? "stale" : "error", message
      } : old);
      retries += 1;
      retryTimer = setTimeout(() => { retryTimer = null; connect(); }, Math.min(30_000, 1000 * 2 ** Math.min(5, retries - 1)));
    };

    (async () => {
      try {
        const batch = await fetchBinanceSpotCandles({ symbol: symbol as RealSpotSymbol, interval:nativeFrame, signal: controller.signal });
        if (disposed) return;
        if (!batch.candles.length) throw new Error("Binance did not return any valid candles.");
        begin("historical", "Historical candles loaded. Connecting live stream…",
          batch.candles, batch.attribution.asOfMs);
        connect();
        healthTimer = setInterval(() => {
          if (receivedAt && Date.now() - receivedAt > (isSecondsFrame(interval)?8_000:30_000)) {
            setSnapshot(old => old.key === key && old.status === "live"
              ? {...old, status: "stale", message: "No live update received for over "+(isSecondsFrame(interval)?"8":"30")+" seconds."} : old);
          }
        }, 5_000);
      } catch (error) {
        if (disposed || controller.signal.aborted) return;
        begin("error", error instanceof Error ? error.message : "Could not retrieve market history.");
      }
    })();

    return () => {
      disposed = true;
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
      if (healthTimer) clearInterval(healthTimer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        socket.onopen = null;
        socket.close();
      }
    };
  }, [key, nativeFrame, interval, active]);

  const projected = useMemo(() => chartCandles(
    isSecondsFrame(interval)?
      aggregateSeconds(snapshot.candles,interval as "1s"|"5s"|"10s"|"15s"|"30s"|"45s"):
      snapshot.candles), [snapshot.candles,interval]);
  if (!active) return ENABLE_TEST_FIXTURES && mode === "demo" ? {
    candles: demo, status: "synthetic",
    sourceLabel: "TEST FIXTURE · synthetic candles", message: null,
    lastUpdatedMs: null, retry: () => setRevision(value => value + 1),
  } : {
    candles: EMPTY_CANDLES, status: "error",
    sourceLabel: "NO VERIFIED PRICE FEED · " + symbols[symbol].label,
    message: isRealSpotSymbol(symbol)
      ? "This pair has a real Binance Spot source. Select Binance Spot to load actual exchange candles."
      : "No verified OHLC provider is configured for " + symbols[symbol].label + ". This chart will not generate or substitute fictional prices.",
    lastUpdatedMs: null, retry: () => setRevision(value => value + 1),
  };
  const current = snapshot.key === key ? snapshot : {
    key, candles: [], status: "loading" as PriceStatus,
    message: "Loading Binance Spot candles…", asOfMs: null
  };
  return {
    candles: snapshot.key === key ? projected : EMPTY_CANDLES,
    status: current.status,
    sourceLabel: isSecondsFrame(interval) && interval!=="1s" ?
      "Binance Spot · "+symbols[symbol].label+" · aggregated native 1s klines" : "Binance Spot · "+symbols[symbol].label,
    message: current.message,
    lastUpdatedMs: current.asOfMs,
    retry: () => setRevision(value => value + 1),
  };
}
