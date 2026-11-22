import { useEffect, useMemo, useRef } from "react";
import {
  createChart, CandlestickSeries, LineSeries,
  type IChartApi, type ISeriesApi, type IPriceLine, type UTCTimestamp
} from "lightweight-charts";
import { demoCandles, sma, symbols, type Frame, type SymbolId } from "./market";
import type { Level } from "./workspace";

interface Props {
  symbol: SymbolId;
  frame: Frame;
  dark: boolean;
  showSma: boolean;
  levels: Level[];
  drawMode: boolean;
  onPlaceLevel: (price: number) => void;
}
export function ChartCanvas({ symbol, frame, dark, showSma, levels, drawMode, onPlaceLevel }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLines = useRef<IPriceLine[]>([]);
  const callback = useRef(onPlaceLevel);
  const armed = useRef(drawMode);
  callback.current = onPlaceLevel;
  armed.current = drawMode;
  const candles = useMemo(() => demoCandles(symbol, frame), [symbol, frame]);

  useEffect(() => {
    if (!host.current) return;
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
    s.setData(candles);
    if (showSma) {
      const movingAverage = c.addSeries(LineSeries, {
        color: "#e1ad67", lineWidth: 2, priceLineVisible: false, lastValueVisible: false
      });
      movingAverage.setData(sma(candles, 20));
    }
    const handleChartClick = (param: { point?: { y: number } }) => {
      if (!armed.current || !param.point) return;
      const value = s.coordinateToPrice(param.point.y);
      if (value !== null && Number.isFinite(value) && value > 0) callback.current(value);
    };
    c.subscribeClick(handleChartClick);
    chart.current = c;
    series.current = s;
    c.timeScale().fitContent();
    return () => {
      c.unsubscribeClick(handleChartClick);
      priceLines.current = [];
      chart.current = null;
      series.current = null;
      c.remove();
    };
  }, [symbol, frame, dark, showSma, candles]);

  useEffect(() => {
    const s = series.current;
    if (!s) return;
    for (const line of priceLines.current) s.removePriceLine(line);
    priceLines.current = levels.filter(l => l.symbol === symbol).map(level =>
      s.createPriceLine({ price: level.price, color: level.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "LEVEL" })
    );
  }, [levels, symbol, frame, dark, showSma]);

  return <div ref={host} className={drawMode ? "chart-canvas drawing-armed" : "chart-canvas"}
    role="img" aria-label={"Interactive synthetic " + symbols[symbol].label + " candlestick chart"} />;
}
