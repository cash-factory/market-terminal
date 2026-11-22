import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { FIBONACCI_LEVELS, fibonacciPrices, translateDrawing, type ChartAnchor, type Drawing, type DrawingTool } from "./types";

type Point = { x: number; y: number };
type Projected = { a: Point; b: Point };
type Gesture = {
  kind: "create" | "move" | "start" | "end";
  startPixel: Point;
  original?: Drawing;
  anchor?: ChartAnchor;
};

interface Props {
  chart: IChartApi;
  series: ISeriesApi<"Candlestick">;
  symbol: Drawing["symbol"];
  tool: DrawingTool | null;
  drawings: Drawing[];
  color: string;
  onAdd: (drawing: Drawing) => void;
  onUpdate: (drawing: Drawing) => void;
  onDelete: (id: string) => void;
}

export function DrawingOverlay({ chart, series, symbol, tool, drawings, color, onAdd, onUpdate, onDelete }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<Drawing | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState(0);
  const animationFrame = useRef<number | null>(null);
  const displayed = drawings.filter(d => d.symbol === symbol);

  const coords = (event: ReactPointerEvent<SVGElement>): Point => {
    const rect = svg.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const anchorAt = (p: Point): ChartAnchor | null => {
    const time = chart.timeScale().coordinateToTime(p.x);
    const price = series.coordinateToPrice(p.y);
    if (typeof time !== "number" || price === null || !Number.isFinite(price) || price <= 0) return null;
    return { time, price };
  };
  const project = (drawing: Drawing): Projected | null => {
    const ax = chart.timeScale().timeToCoordinate(drawing.start.time as UTCTimestamp);
    const bx = chart.timeScale().timeToCoordinate(drawing.end.time as UTCTimestamp);
    const ay = series.priceToCoordinate(drawing.start.price);
    const by = series.priceToCoordinate(drawing.end.price);
    if (ax === null || bx === null || ay === null || by === null) return null;
    return { a: { x: ax, y: ay }, b: { x: bx, y: by } };
  };

  // Reproject time/price anchors while the chart pans, zooms, or resizes.
  useEffect(() => {
    const refresh = () => {
      if (animationFrame.current !== null) return;
      animationFrame.current = requestAnimationFrame(() => {
        animationFrame.current = null;
        setViewport(v => v + 1);
      });
    };
    const resize = new ResizeObserver(refresh);
    if (svg.current) resize.observe(svg.current);
    chart.timeScale().subscribeVisibleLogicalRangeChange(refresh);
    return () => {
      resize.disconnect();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(refresh);
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [chart]);

  useEffect(() => {
    setSelectedId(null);
    setDraft(null);
    gesture.current = null;
  }, [symbol, tool]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { gesture.current = null; setDraft(null); setSelectedId(null); }
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        const selected = drawings.find(d => d.id === selectedId);
        if (selected && !selected.locked) {
          event.preventDefault();
          onDelete(selectedId);
          setSelectedId(null);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, drawings, onDelete]);

  const startDrag = (event: ReactPointerEvent<SVGGElement | SVGCircleElement>, drawing: Drawing, kind: Gesture["kind"]) => {
    event.stopPropagation();
    if (tool || drawing.locked) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(drawing.id);
    gesture.current = { kind, original: drawing, startPixel: coords(event) };
  };

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!tool || event.target !== event.currentTarget) return;
    const startPixel = coords(event);
    const anchor = anchorAt(startPixel);
    if (!anchor) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { kind: "create", startPixel, anchor };
    setDraft({
      id: "preview", symbol, tool,
      start: anchor, end: anchor, color, locked: false
    });
    setSelectedId(null);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = gesture.current;
    if (!active) return;
    const current = coords(event);
    if (active.kind === "create") {
      const end = anchorAt(current);
      if (end && active.anchor) setDraft({
        id: "preview", symbol, tool: tool!, start: active.anchor,
        end, color, locked: false
      });
      return;
    }
    const original = active.original;
    if (!original) return;
    const projected = project(original);
    if (!projected) return;
    const dx = current.x - active.startPixel.x;
    const dy = current.y - active.startPixel.y;
    const start = active.kind === "end" ? original.start
      : anchorAt({ x: projected.a.x + dx, y: projected.a.y + dy });
    const end = active.kind === "start" ? original.end
      : anchorAt({ x: projected.b.x + dx, y: projected.b.y + dy });
    if (start && end) setDraft(translateDrawing(original, start, end));
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const active = gesture.current;
    if (!active) return;
    gesture.current = null;
    const movement = coords(event);
    const distance = Math.hypot(movement.x - active.startPixel.x, movement.y - active.startPixel.y);
    if (draft && distance >= 4) {
      if (active.kind === "create") {
        onAdd({ ...draft, id: crypto.randomUUID() });
      } else {
        onUpdate(draft);
        setSelectedId(draft.id);
      }
    }
    setDraft(null);
  };

  const renderDrawing = (drawing: Drawing) => {
    const positions = project(drawing);
    if (!positions) return null;
    const { a, b } = positions;
    const selected = selectedId === drawing.id && !tool;
    const isPreview = drawing.id === "preview";
    const common = {
      stroke: drawing.color,
      strokeWidth: selected ? 2.3 : 1.8,
      strokeDasharray: isPreview ? "5 4" : undefined,
      vectorEffect: "non-scaling-stroke" as const
    };
    return <g key={drawing.id} className={"drawing-shape " + (selected ? "is-selected" : "")}
      onPointerDown={event => !isPreview && startDrag(event, drawing, "move")}>
      {drawing.tool === "trendline" && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        {...common} className="drawing-line" />}
      {drawing.tool === "rectangle" && <rect
        x={Math.min(a.x, b.x)} y={Math.min(a.y, b.y)}
        width={Math.max(1, Math.abs(b.x - a.x))} height={Math.max(1, Math.abs(b.y - a.y))}
        fill={drawing.color} fillOpacity={.08} {...common} className="drawing-rectangle"/>}
      {drawing.tool === "fibonacci" && <>
        {FIBONACCI_LEVELS.map((level, i) => {
          const price = fibonacciPrices(a.y, b.y)[i];
          return <g key={level}>
            <line x1={Math.min(a.x, b.x)} x2={Math.max(a.x, b.x)}
              y1={price} y2={price} {...common} strokeOpacity={i === 0 || i === FIBONACCI_LEVELS.length - 1 ? 1 : .76} className="drawing-line"/>
            <text x={Math.max(a.x, b.x) + 5} y={price - 3}
              fill={drawing.color} fontSize={10} pointerEvents="none">{(level * 100).toFixed(1)}%</text>
          </g>;
        })}
      </>}
      {selected && !drawing.locked && [a, b].map((p, index) =>
        <circle key={index} cx={p.x} cy={p.y} r="5.5" fill="var(--panel)"
          stroke={drawing.color} strokeWidth="2" className="drawing-handle"
          onPointerDown={event => startDrag(event, drawing, index === 0 ? "start" : "end")}/>
      )}
    </g>;
  };

  // viewport update is deliberately read: chart transforms live outside React.
  void viewport;
  return <svg ref={svg} className={"drawing-overlay " + (tool ? "armed" : "")}
    aria-label={tool ? "Drag to place a " + tool : "Chart drawing overlay"}
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
    onPointerCancel={() => { gesture.current = null; setDraft(null); }}>
    {displayed.map(renderDrawing)}
    {draft && renderDrawing(draft)}
  </svg>;
}
