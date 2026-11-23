import { useEffect, useMemo, useState } from "react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { demoCandles, isSecondsFrame, type Frame, type SymbolId } from "../market";
import { aggregateSeconds } from "./seconds";
import { fetchBinanceSpotCandles } from "./binance";
import type { Candle } from "./contracts";
import { hasCandleGaps, mergeExchangeHistory } from "./reconciliation";
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
const STREAM_URL = "wss://data-stream.binance.vision:443/ws/btcusdt@kline_";
const STREAM_TIMEOUT_MS = 30_000;
const REPAIR_THROTTLE_MS = 60_000;

/**
 * Opt-in, browser-side Spot prices. Every reconnect rechecks REST history before
 * returning to streaming. A missed candle or silent socket is marked stale;
 * synthetic data is never substituted for exchange data.
 */
export function usePriceFeed(symbol: SymbolId, interval: Frame, mode: PriceSource): PriceFeed {
  const demo = useMemo(() => demoCandles(symbol, interval), [symbol, interval]);
  const [revision, setRevision] = useState(0);
  const key = symbol + ":" + interval + ":" + mode + ":" + revision;
  const [snapshot, setSnapshot] = useState<FeedSnapshot>({
    key: "", candles: [], status: "loading", message: null, asOfMs: null,
  });
  const active = mode === "binance" && symbol === "BTCUSDT";
  const nativeFrame:Frame = isSecondsFrame(interval) ? "1s" : interval;

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    const controller = new AbortController();
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let healthTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempts = 0;
    let receivedAt = 0;
    let socketOpenedAt = 0;
    let lastUpdatedAt: number | null = null;
    let candles: Candle[] = [];
    let repairPending = false;
    let nextRepairAllowedAt = 0;

    const publish = (status: PriceStatus, message: string | null) => {
      if (!disposed) setSnapshot({ key, candles, status, message, asOfMs: lastUpdatedAt });
    };
    const errorText = (error: unknown) =>
      error instanceof Error ? error.message : "Exchange data is temporarily unavailable.";

    const repairHistory = () => {
      if (disposed || repairPending || Date.now() < nextRepairAllowedAt) return;
      repairPending = true;
      nextRepairAllowedAt = Date.now() + REPAIR_THROTTLE_MS;
      publish("stale", "Missing exchange candles detected. Repairing from verified history…");
      void (async () => {
        try {
          const batch = await fetchBinanceSpotCandles({ interval:nativeFrame, signal: controller.signal });
          if (disposed || !batch.candles.length) return;
          candles = mergeExchangeHistory(candles, batch.candles);
          if (hasCandleGaps(candles, nativeFrame)) {
            publish("stale", "Exchange history still has missing intervals. The chart is not current.");
            return;
          }
          lastUpdatedAt = receivedAt || Date.now();
          const streaming = socket?.readyState === WebSocket.OPEN &&
            receivedAt > 0 && Date.now() - receivedAt <= STREAM_TIMEOUT_MS;
          publish(streaming ? "live" : "historical",
            streaming ? null : "Exchange candles reconciled. Waiting for the live stream…");
          nextRepairAllowedAt = 0;
        } catch (error) {
          if (!disposed && !controller.signal.aborted) {
            publish("stale", "Could not repair missing exchange candles: " + errorText(error));
          }
        } finally {
          repairPending = false;
        }
      })();
    };

    const scheduleReconnect = (message: string) => {
      if (disposed || retryTimer !== null) return;
      publish(candles.length ? "stale" : "error", message);
      reconnectAttempts += 1;
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(5, reconnectAttempts - 1));
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void syncThenConnect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;
      if (typeof WebSocket === "undefined") {
        publish("error", "This browser does not support live WebSocket streaming.");
        return;
      }
      let nextSocket: WebSocket;
      try {
        nextSocket = new WebSocket(STREAM_URL + nativeFrame);
      } catch {
        scheduleReconnect("Could not open the Binance Spot stream. Retrying with history check…");
        return;
      }
      socket = nextSocket;
      nextSocket.onopen = () => {
        if (disposed || socket !== nextSocket) return;
        socketOpenedAt = Date.now();
        receivedAt = 0;
        publish(hasCandleGaps(candles, nativeFrame) ? "stale" : "connecting",
          "Stream connected; awaiting a verified market update…");
      };
      nextSocket.onmessage = event => {
        let parsed: unknown;
        try { parsed = JSON.parse(String(event.data)); } catch { return; }
        const candle = parseBinanceStreamCandle(parsed, nativeFrame);
        if (!candle || disposed || socket !== nextSocket) return;
        receivedAt = Date.now();
        reconnectAttempts = 0;
        lastUpdatedAt = receivedAt;
        candles = mergeStreamCandle(candles, candle);
        if (hasCandleGaps(candles, nativeFrame)) {
          publish("stale", "Missing exchange candles detected. Reconciliation required.");
          repairHistory();
        } else if (repairPending) {
          publish("stale", "Checking exchange history after a gap…");
        } else {
          publish("live", null);
        }
      };
      nextSocket.onerror = () => {
        // A close event handles backoff; avoid reporting an error as a live price.
      };
      nextSocket.onclose = () => {
        if (!disposed && socket === nextSocket) {
          socket = null;
          scheduleReconnect("Stream disconnected. Rechecking missed candles before reconnecting…");
        }
      };
    };

    const syncThenConnect = async () => {
      if (disposed) return;
      publish(candles.length ? "stale" : "loading",
        candles.length ? "Checking exchange candles after a disconnection…" : "Loading Binance Spot candles…");
      try {
        const batch = await fetchBinanceSpotCandles({ interval:nativeFrame, signal: controller.signal });
        if (disposed) return;
        if (!batch.candles.length) throw new Error("Binance returned no valid candles.");
        candles = mergeExchangeHistory(candles, batch.candles);
        lastUpdatedAt = batch.attribution.asOfMs;
        publish(hasCandleGaps(candles, nativeFrame) ? "stale" : "historical",
          hasCandleGaps(candles, nativeFrame)
            ? "Some historical candles are missing; live stream will attempt repair."
            : "Historical exchange candles synchronized. Connecting live stream…");
        connect();
      } catch (error) {
        if (disposed || controller.signal.aborted) return;
        scheduleReconnect("Exchange history unavailable: " + errorText(error) + " Retrying…");
      }
    };

    publish("loading", "Loading Binance Spot candles…");
    void syncThenConnect();
    healthTimer = setInterval(() => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      const latestActivity = receivedAt || socketOpenedAt;
      if (latestActivity && Date.now() - latestActivity > STREAM_TIMEOUT_MS) {
        // A connected but silent WebSocket must not continue to appear live.
        socket.close();
      }
    }, 5_000);

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

  const projected = useMemo(() => chartCandles(isSecondsFrame(interval)?
      aggregateSeconds(snapshot.candles,interval as "1s"|"5s"|"10s"|"15s"|"30s"|"45s"):
      snapshot.candles), [snapshot.candles,interval]);
  if (!active) return {
    candles: demo, status: "synthetic",
    sourceLabel: "Synthetic demonstration candles", message: null,
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
      "Binance Spot · BTC/USDT · aggregated native 1s klines" : "Binance Spot · BTC/USDT",
    message: current.message,
    lastUpdatedMs: current.asOfMs,
    retry: () => setRevision(value => value + 1),
  };
}
