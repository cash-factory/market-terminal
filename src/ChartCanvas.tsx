import { useEffect, useRef, useState } from "react";
import {
  createChart, CandlestickSeries, LineSeries, type CandlestickData,
  type IChartApi, type ISeriesApi, type IPriceLine, type UTCTimestamp
} from "lightweight-charts";
import { sma, symbols, type Frame, type SymbolId } from "./market";
import type { Level } from "./workspace";
import type { PriceSource } from "./data/usePriceFeed";
import { DrawingOverlay } from "./drawing/DrawingOverlay";
import type { Drawing, DrawingTool } from "./drawing/types";

interface Props {
  symbol: SymbolId;
  frame: Frame;
  source: PriceSource;
  candles: CandlestickData<UTCTimestamp>[];
  dark: boolean;
  showSma: boolean;
  levels: Level[];
  drawMode: boolean;
  onPlaceLevel: (price: number) => void;
  drawingTool: DrawingTool | null;
  drawings: Drawing[];
  drawingColor: string;
  onAddDrawing: (drawing: Drawing) => void;
  onUpdateDrawing: (drawing: Drawing) => void;
  onDeleteDrawing: (id: string) => void;
}
type Surface = { chart: IChartApi; series: ISeriesApi<"Candlestick"> };

export function ChartCanvas({
  symbol, frame, source, candles, dark, showSma, levels, drawMode, onPlaceLevel,
  drawingTool, drawings, drawingColor, onAddDrawing, onUpdateDrawing, onDeleteDrawing
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const average = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLines = useRef<IPriceLine[]>([]);
  const fitted = useRef(false);
  const [surface, setSurface] = useState<Surface | null>(null);
  const callback = useRef(onPlaceLevel);
  const armed = useRef(drawMode);
  callback.current = onPlaceLevel;
  armed.current = drawMode;

  // Create a chart only when its workspace changes, never on each live candle.
  useEffect(() => {
    if (!host.current) return;
    fitted.current = false;
    const c = createChart(host.current, {
      autoSize: true,
      layout: { background: { color: dark ? "#101821" : "#ffffff" }, textColor: dark ? "#8e9bad" : "#64748b" },
      grid: { vertLines: { color: dark ? "#202d39" : "#edf1f5" }, horzLines: { color: dark ? "#202d39" : "#edf1f5" } },
      timeScale: { borderColor: dark ? "#293644" : "#dce4eb" },
      rightPriceScale: { borderColor: dark ? "#293644" : "#dce4eb" },
    });
    const s = c.addSeries(CandlestickSeries, {
      upColor: "#22b98e", downColor: "#e66a77", borderVisible: false,
      wickUpColor: "#22b98e", wickDownColor: "#e66a77",
      priceFormat: { type: "price", precision: symbols[symbol].precision, minMove: Math.pow(10, -symbols[symbol].precision) },
    });
    average.current = showSma
      ? c.addSeries(LineSeries, { color: "#e1ad67", lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
      : null;
    const handleChartClick = (param: { point?: { y: number } }) => {
      if (!armed.current || !param.point) return;
      const value = s.coordinateToPrice(param.point.y);
      if (value !== null && Number.isFinite(value) && value > 0) callback.current(value);
    };
    c.subscribeClick(handleChartClick);
    chart.current = c;
    series.current = s;
    setSurface({ chart: c, series: s });
    return () => {
      c.unsubscribeClick(handleChartClick);
      priceLines.current = [];
      chart.current = null;
      series.current = null;
      average.current = null;
      c.remove();
    };
  }, [symbol, frame, dark, showSma, source]);

  useEffect(() => {
    if (!series.current) return;
    series.current.setData(candles);
    if (average.current) average.current.setData(sma(candles, 20));
    if (candles.length > 0 && !fitted.current) {
      chart.current?.timeScale().fitContent();
      fitted.current = true;
    }
  }, [candles, symbol, frame, dark, showSma, source]);

  useEffect(() => {
    const s = series.current;
    if (!s) return;
    for (const line of priceLines.current) s.removePriceLine(line);
    priceLines.current = levels.filter(l => l.symbol === symbol && (l.source ?? "demo") === source).map(level =>
      s.createPriceLine({ price: level.price, color: level.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "LEVEL" })
    );
  }, [levels, symbol, frame, dark, showSma, source]);

  return <div className="chart-surface">
    <div ref={host} className={drawMode ? "chart-canvas drawing-armed" : "chart-canvas"}
      role="img" aria-label={source === "demo"
        ? "Synthetic " + symbols[symbol].label + " candlestick chart"
        : "Binance Spot " + symbols[symbol].label + " candlestick chart"}/>
    {surface && surface.chart === chart.current && <DrawingOverlay
      chart={surface.chart} series={surface.series} symbol={symbol} frame={frame} candles={candles}
      tool={drawingTool} drawings={drawings} color={drawingColor}
      onAdd={onAddDrawing} onUpdate={onUpdateDrawing} onDelete={onDeleteDrawing}
    />}
  </div>;
}
