import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type {
  CandlestickData, IChartApi, ISeriesApi, Logical, UTCTimestamp
} from "lightweight-charts";
import { frameSeconds, type Frame } from "../market";
import {
  FIBONACCI_LEVELS, fibonacciPrices, translateDrawing,
  type ChartAnchor, type Drawing, type DrawingTool
} from "./types";
import {
  inChartPlot, logicalFromTime, pointerDistance, timeFromLogical, type ChartPoint
} from "./geometry";

type Projected = { a: ChartPoint; b: ChartPoint };
type Gesture = {
  kind: "create" | "move" | "start" | "end";
  origin: ChartPoint;
  original?: Drawing;
  first?: ChartAnchor;
};
type PendingClick = { tool: DrawingTool; first: ChartAnchor };

interface Props {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  symbol: Drawing["symbol"];
  frame: Frame;
  candles: readonly CandlestickData<UTCTimestamp>[];
  tool: DrawingTool | null;
  drawings: Drawing[];
  color: string;
  onAdd: (drawing: Drawing) => void;
  onUpdate: (drawing: Drawing) => void;
  onDelete: (id: string) => void;
}

export function DrawingOverlay({
  chart, series, symbol, frame, candles, tool, drawings, color, onAdd, onUpdate, onDelete
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const draftRef = useRef<Drawing | null>(null);
  const pendingRef = useRef<PendingClick | null>(null);
  const [draft, setDraftState] = useState<Drawing | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [, setRevision] = useState(0);
  const animationFrame = useRef<number | null>(null);

  const setDraft = (next: Drawing | null) => {
    draftRef.current = next;
    setDraftState(next);
  };

  const pointFromEvent = (event: ReactPointerEvent<SVGElement>): ChartPoint => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const anchorAt = (point: ChartPoint): ChartAnchor | null => {
    const scale = chart.timeScale();
    if (!inChartPlot(point, scale.width(), svgRef.current!.clientHeight - scale.height())) return null;
    const logical = scale.coordinateToLogical(point.x);
    const price = series.coordinateToPrice(point.y);
    if (logical === null || price === null || !Number.isFinite(price) || price <= 0) return null;
    const time = timeFromLogical(logical, candles, frameSeconds[frame]);
    if (time === null) return null;
    return { time, price };
  };
  const project = (drawing: Drawing): Projected | null => {
    const scale = chart.timeScale();
    const aLogical = logicalFromTime(drawing.start.time, candles, frameSeconds[frame]);
    const bLogical = logicalFromTime(drawing.end.time, candles, frameSeconds[frame]);
    if (aLogical === null || bLogical === null) return null;
    const ax = scale.logicalToCoordinate(aLogical as Logical);
    const bx = scale.logicalToCoordinate(bLogical as Logical);
    const ay = series.priceToCoordinate(drawing.start.price);
    const by = series.priceToCoordinate(drawing.end.price);
    if ([ax, bx, ay, by].some(p => p === null || !Number.isFinite(p))) return null;
    return { a: { x: ax!, y: ay! }, b: { x: bx!, y: by! } };
  };
  const makeDrawing = (first: ChartAnchor, end: ChartAnchor, selectedTool: DrawingTool): Drawing => ({
    id: "preview", symbol, tool: selectedTool, start: first, end, color, locked: false
  });

  // Chart's time scale changes independently of React when the user pans or zooms.
  useEffect(() => {
    const refresh = () => {
      if (animationFrame.current !== null) return;
      animationFrame.current = requestAnimationFrame(() => {
        animationFrame.current = null;
        setRevision(n => n + 1);
      });
    };
    const observer = new ResizeObserver(refresh);
    if (svgRef.current) observer.observe(svgRef.current);
    chart.timeScale().subscribeVisibleLogicalRangeChange(refresh);
    chart.subscribeCrosshairMove(refresh);
    window.addEventListener("pointermove", refresh, { passive: true });
    return () => {
      observer.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(refresh);
      chart.unsubscribeCrosshairMove(refresh);
      window.removeEventListener("pointermove", refresh);
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [chart]);

  useEffect(() => {
    gestureRef.current = null;
    pendingRef.current = null;
    setDraft(null);
    setSelectedId(null);
  }, [symbol, tool, frame]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        gestureRef.current = null;
        pendingRef.current = null;
        setDraft(null);
        setSelectedId(null);
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        const selected = drawings.find(d => d.id === selectedId);
        if (selected && !selected.locked) {
          event.preventDefault();
          onDelete(selectedId);
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawings, onDelete, selectedId]);

  const capture = (event: ReactPointerEvent<SVGElement>) => {
    try { svgRef.current?.setPointerCapture(event.pointerId); } catch { /* pointer was released */ }
  };
  const beginEdit = (event: ReactPointerEvent<SVGElement>, drawing: Drawing, kind: Gesture["kind"]) => {
    if (tool || drawing.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    capture(event);
    setSelectedId(drawing.id);
    gestureRef.current = { kind, origin: pointFromEvent(event), original: drawing };
    setDraft(null);
  };
  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    // The transparent plot hit-surface is an SVG child. Prior versions rejected
    // all clicks landing on child nodes, so ordinary chart interaction could be ignored.
    const target = event.target;
    const onPlotSurface = target === event.currentTarget ||
      (target instanceof SVGRectElement && target.dataset.drawingSurface === "true");
    if (!tool || event.button !== 0 || !onPlotSurface) return;
    const point = pointFromEvent(event);
    const anchor = anchorAt(point);
    if (!anchor) return;
    event.preventDefault();
    capture(event);
    gestureRef.current = {
      kind: "create", origin: point,
      first: pendingRef.current?.tool === tool ? pendingRef.current.first : anchor
    };
    setDraft(makeDrawing(gestureRef.current.first!, anchor, tool));
    setSelectedId(null);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    const active = gestureRef.current;
    if (!active) {
      const pending = pendingRef.current;
      if (pending && tool === pending.tool) {
        const next = anchorAt(point);
        if (next) setDraft(makeDrawing(pending.first, next, tool));
      }
      return;
    }
    if (active.kind === "create") {
      const next = anchorAt(point);
      if (next && active.first && tool) setDraft(makeDrawing(active.first, next, tool));
      return;
    }
    if (!active.original) return;
    const originalProjected = project(active.original);
    if (!originalProjected) return;
    const dx = point.x - active.origin.x;
    const dy = point.y - active.origin.y;
    const start = active.kind === "end" ? active.original.start :
      anchorAt({ x: originalProjected.a.x + dx, y: originalProjected.a.y + dy });
    const end = active.kind === "start" ? active.original.end :
      anchorAt({ x: originalProjected.b.x + dx, y: originalProjected.b.y + dy });
    if (start && end) setDraft(translateDrawing(active.original, start, end));
  };
  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = gestureRef.current;
    if (!active) return;
    gestureRef.current = null;
    const point = pointFromEvent(event);
    const distance = pointerDistance(active.origin, point);
    if (active.kind === "create") {
      const second = anchorAt(point);
      if (!tool || !second || !active.first) {
        setDraft(null);
        pendingRef.current = null;
        return;
      }
      if (distance >= 5 || pendingRef.current) {
        const completed = makeDrawing(active.first, second, tool);
        pendingRef.current = null;
        setDraft(null);
        if (completed.start.time !== completed.end.time || completed.start.price !== completed.end.price) {
          onAdd({ ...completed, id: crypto.randomUUID() });
        }
      } else {
        // TradingView-like click once to set the first point, click again to finish.
        pendingRef.current = { tool, first: active.first };
        setDraft(makeDrawing(active.first, second, tool));
      }
    } else {
      const committed = draftRef.current;
      setDraft(null);
      if (distance >= 2 && committed && active.original) {
        onUpdate(committed);
      }
    }
  };
  const cancel = () => {
    gestureRef.current = null;
    pendingRef.current = null;
    setDraft(null);
  };

  const renderDrawing = (drawing: Drawing) => {
    const position = project(drawing);
    if (!position) return null;
    const { a, b } = position;
    const isPreview = drawing.id === "preview";
    const selected = selectedId === drawing.id && !tool;
    const common = {
      stroke: drawing.color,
      strokeWidth: selected ? 2.4 : 1.8,
      strokeDasharray: isPreview ? "5 4" : undefined,
      vectorEffect: "non-scaling-stroke" as const,
    };
    return <g key={drawing.id} className={"drawing-shape " + (selected ? "is-selected" : "")}
      onPointerDown={event => { if (!isPreview) beginEdit(event, drawing, "move"); }}>
      {drawing.tool === "trendline" && <>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent"
          strokeWidth={16} className="drawing-hit" />
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...common} className="drawing-line"/>
      </>}
      {drawing.tool === "rectangle" && <rect x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)}
        width={Math.max(1,Math.abs(b.x-a.x))} height={Math.max(1,Math.abs(b.y-a.y))}
        fill={drawing.color} fillOpacity={0.08} {...common} className="drawing-rectangle"/>}
      {drawing.tool === "fibonacci" && FIBONACCI_LEVELS.map((level, i) => {
        const y = fibonacciPrices(a.y, b.y)[i];
        const x1 = Math.min(a.x, b.x);
        const x2 = Math.max(a.x, b.x);
        return <g key={level}>
          <line x1={x1} x2={x2} y1={y} y2={y} stroke="transparent"
            strokeWidth={12} className="drawing-hit"/>
          <line x1={x1} x2={x2} y1={y} y2={y} {...common}
            strokeOpacity={i === 0 || i === FIBONACCI_LEVELS.length - 1 ? 1 : .75}
            className="drawing-line"/>
          <text x={x2+6} y={y-4} fill={drawing.color} fontSize={10}
            pointerEvents="none">{(level*100).toFixed(1)}%</text>
        </g>;
      })}
      {isPreview && <circle cx={a.x} cy={a.y} r={4} fill={drawing.color} pointerEvents="none" />}
      {selected && !drawing.locked && [a,b].map((p,i) =>
        <circle key={i} cx={p.x} cy={p.y} r={7} fill="var(--panel)"
          stroke={drawing.color} strokeWidth={2} className="drawing-handle"
          onPointerDown={event => beginEdit(event, drawing, i === 0 ? "start" : "end")}/>
      )}
    </g>;
  };

  return <svg ref={svgRef} className={"drawing-overlay " + (tool ? "armed" : "")}
    aria-label={tool ? "Draw " + tool + ": drag or click two points" : "Select chart drawings"}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={cancel} onLostPointerCapture={() => { /* normal end handled by pointerup */ }}>
    {/* A real transparent SVG rect is required: empty SVG pixels are not reliably
        pointer targets in every browser. Restrict interception to chart plotting area. */}
    <rect className="drawing-plot-surface" data-drawing-surface="true"
      x={0} y={0} width="100%" height="100%"
      fill="transparent" pointerEvents={tool ? "all" : "none"}/>
    {drawings.filter(d => d.symbol === symbol && !d.hidden).map(d => renderDrawing(draft?.id === d.id ? draft : d))}
    {draft?.id === "preview" && renderDrawing(draft)}
  </svg>;
}
