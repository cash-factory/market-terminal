import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import {ALL_FRAMES,type Frame,type SymbolId} from "../market";
import type { PriceSource, PriceStatus } from "../data/usePriceFeed";

export type DecisionDirection = "bullish" | "bearish" | "wait";
export type PlanAdherence = "followed" | "changed" | "unassessed";
export type ObservationOutcome = "supported" | "invalidated" | "unresolved";

export type DecisionSetup = {
  direction: DecisionDirection;
  thesis: string;
  trigger: string;
  invalidation: string;
};

export type DecisionSnapshot = {
  barTimeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  barsVisible: number;
};

export type DecisionReview = {
  id: string;
  createdAtMs: number;
  adherence: PlanAdherence;
  outcome: ObservationOutcome;
  note: string;
};

/**
 * Decision records are observations, not orders or trading advice.
 * The original hypothesis and visible last candle are never rewritten by a review.
 */
export type DecisionRecord = {
  id: string;
  createdAtMs: number;
  symbol: SymbolId;
  frame: Frame;
  source: PriceSource;
  feedStatus: PriceStatus;
  replay: boolean;
  snapshot: DecisionSnapshot;
  setup: DecisionSetup;
  reviews: DecisionReview[];
};

type CaptureContext = {
  symbol: SymbolId;
  frame: Frame;
  source: PriceSource;
  feedStatus: PriceStatus;
  replay: boolean;
  visibleCandles: readonly CandlestickData<UTCTimestamp>[];
};

const SYMBOLS = ["EURUSD", "BTCUSDT", "AAPL", "US100"] as const;
const FRAMES:readonly Frame[]=ALL_FRAMES;
const SOURCES = ["demo", "binance"] as const;
const STATUSES = ["synthetic", "loading", "connecting", "historical", "live", "stale", "error"] as const;
const DIRECTIONS = ["bullish", "bearish", "wait"] as const;
const ADHERENCE = ["followed", "changed", "unassessed"] as const;
const OUTCOMES = ["supported", "invalidated", "unresolved"] as const;

const recordLike = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const bounded = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length <= max;
const time = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function cleanDecisionSetup(raw: DecisionSetup): DecisionSetup {
  const setup = {
    direction: DIRECTIONS.includes(raw.direction) ? raw.direction : "wait" as DecisionDirection,
    thesis: raw.thesis.trim(),
    trigger: raw.trigger.trim(),
    invalidation: raw.invalidation.trim(),
  };
  if (!setup.thesis || !setup.trigger || !setup.invalidation) {
    throw new Error("Complete the thesis, confirmation and invalidation before saving.");
  }
  if (setup.thesis.length > 500 || setup.trigger.length > 300 || setup.invalidation.length > 300) {
    throw new Error("One of the decision fields exceeds its character limit.");
  }
  return setup;
}

export function captureDecision(
  context: CaptureContext, setup: DecisionSetup, id: string, nowMs: number,
): DecisionRecord {
  if (!id.trim() || !time(nowMs)) throw new Error("Could not timestamp the decision.");
  const candle = context.visibleCandles.at(-1);
  if (!candle || !positive(candle.open) || !positive(candle.high) ||
      !positive(candle.low) || !positive(candle.close)) {
    throw new Error("An observed candle is required to capture this decision.");
  }
  if (candle.high < Math.max(candle.open, candle.close) ||
      candle.low > Math.min(candle.open, candle.close) || candle.high < candle.low) {
    throw new Error("The latest observed candle is invalid.");
  }
  const barTimeMs = Number(candle.time) * 1000;
  if (!Number.isSafeInteger(barTimeMs) || barTimeMs <= 0 || barTimeMs > nowMs) {
    throw new Error("Cannot capture a candle from an unknown or future time.");
  }
  if (context.source === "binance" && context.symbol !== "BTCUSDT") {
    throw new Error("Binance Spot provenance is only supported for BTC/USDT.");
  }
  return {
    id, createdAtMs: nowMs, symbol: context.symbol, frame: context.frame,
    source: context.source, feedStatus: context.feedStatus, replay: context.replay,
    snapshot: {
      barTimeMs, open: candle.open, high: candle.high, low: candle.low,
      close: candle.close, barsVisible: context.visibleCandles.length,
    },
    setup: cleanDecisionSetup(setup), reviews: [],
  };
}

export function appendDecisionReview(
  original: DecisionRecord,
  input: { adherence: PlanAdherence; outcome: ObservationOutcome; note: string },
  id: string,
  nowMs: number,
): DecisionRecord {
  if (!ADHERENCE.includes(input.adherence) || !OUTCOMES.includes(input.outcome) ||
      !bounded(input.note, 1000) || !id.trim() || !time(nowMs) || nowMs < original.createdAtMs) {
    throw new Error("Review details are invalid.");
  }
  if (input.adherence === "changed" && !input.note.trim()) {
    throw new Error("Describe what changed before recording a deviation.");
  }
  return { ...original, reviews: [
    ...original.reviews,
    { id, createdAtMs: nowMs, adherence: input.adherence,
      outcome: input.outcome, note: input.note.trim() },
  ] };
}

/** Strict parsing protects existing local workspaces from corrupted imports. */
export function parseDecisionRecords(value: unknown): DecisionRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: DecisionRecord[] = [];
  for (const raw of value) {
    if (!recordLike(raw) || !bounded(raw.id, 128) || !raw.id.trim() ||
        seen.has(raw.id) || !time(raw.createdAtMs) ||
        !SYMBOLS.includes(raw.symbol as SymbolId) || !FRAMES.includes(raw.frame as Frame) ||
        !SOURCES.includes(raw.source as PriceSource) || !STATUSES.includes(raw.feedStatus as PriceStatus) ||
        typeof raw.replay !== "boolean" || !recordLike(raw.snapshot) ||
        !DIRECTIONS.includes((recordLike(raw.setup) ? raw.setup.direction : null) as DecisionDirection) ||
        !recordLike(raw.setup)) continue;
    if (raw.source === "binance" && raw.symbol !== "BTCUSDT") continue;
    const snap = raw.snapshot;
    if (!time(snap.barTimeMs) || snap.barTimeMs > raw.createdAtMs ||
        !positive(snap.open) || !positive(snap.high) || !positive(snap.low) ||
        !positive(snap.close) || snap.high < Math.max(snap.open, snap.close) ||
        snap.low > Math.min(snap.open, snap.close) || snap.high < snap.low ||
        !Number.isSafeInteger(snap.barsVisible) || (snap.barsVisible as number) < 1) continue;
    const s = raw.setup as Record<string, unknown>;
    if (!bounded(s.thesis, 500) || !s.thesis.trim() || !bounded(s.trigger, 300) ||
        !s.trigger.trim() || !bounded(s.invalidation, 300) || !s.invalidation.trim()) continue;
    const reviews: DecisionReview[] = [];
    const reviewIds = new Set<string>();
    if (Array.isArray(raw.reviews)) {
      for (const rev of raw.reviews) {
        if (!recordLike(rev) || !bounded(rev.id, 128) || !rev.id.trim() ||
            reviewIds.has(rev.id) || !time(rev.createdAtMs) ||
            rev.createdAtMs < raw.createdAtMs ||
            !ADHERENCE.includes(rev.adherence as PlanAdherence) ||
            !OUTCOMES.includes(rev.outcome as ObservationOutcome) ||
            !bounded(rev.note, 1000)) continue;
        reviewIds.add(rev.id);
        reviews.push({
          id: rev.id, createdAtMs: rev.createdAtMs,
          adherence: rev.adherence as PlanAdherence,
          outcome: rev.outcome as ObservationOutcome,
          note: rev.note as string,
        });
      }
    }
    seen.add(raw.id);
    result.push({
      id: raw.id, createdAtMs: raw.createdAtMs,
      symbol: raw.symbol as SymbolId, frame: raw.frame as Frame,
      source: raw.source as PriceSource, feedStatus: raw.feedStatus as PriceStatus,
      replay: raw.replay,
      snapshot: {
        barTimeMs: snap.barTimeMs, open: snap.open, high: snap.high,
        low: snap.low, close: snap.close, barsVisible: snap.barsVisible as number,
      },
      setup: {
        direction: s.direction as DecisionDirection,
        thesis: s.thesis, trigger: s.trigger, invalidation: s.invalidation,
      }, reviews,
    });
  }
  return result;
}

export function decisionMetrics(records: readonly DecisionRecord[]) {
  const reviewed = records.filter(record => record.reviews.length > 0).length;
  return { recorded: records.length, reviewed, awaitingReview: records.length - reviewed };
}
