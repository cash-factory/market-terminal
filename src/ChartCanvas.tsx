import { useEffect, useRef, useState } from "react";
import {
  createChart, CandlestickSeries, LineSeries, BarSeries, AreaSeries, type CandlestickData,
  type IChartApi, type ISeriesApi, type IPriceLine, type UTCTimestamp
} from "lightweight-charts";
import { sma, symbols, type Frame, type SymbolId } from "./market";
import type { Level } from "./workspace";
import type { PriceSource } from "./data/usePriceFeed";
import { DrawingOverlay } from "./drawing/DrawingOverlay";
import type { Drawing, DrawingTool } from "./drawing/types";
import { bollingerBands, ema, type StudySettings } from "./indicators/studies";
import { IndicatorPanels } from "./indicators/IndicatorPanels";
import type { StudyParameters } from "./indicators/parameters";
import {closeLineData,heikinAshi,type ChartDisplayStyle} from "./charts/display";
import {evaluateFormula,type CustomStudy} from "./indicators/formula";

export type ChartSurface = {chart:IChartApi;series:ISeriesApi<"Candlestick">};
export type ChartRange=ReturnType<ReturnType<IChartApi["timeScale"]>["getVisibleRange"]>;
interface Props {
  paneId:string;
  onSurfaceReady?:(id:string,surface:ChartSurface|null)=>void;
  onRangeChanged?:(id:string,range:ChartRange)=>void;
  onCrosshairChanged?:(id:string,time:number|null)=>void;
  symbol: SymbolId;
  frame: Frame;
  source: PriceSource;
  chartStyle: ChartDisplayStyle;
  candles: CandlestickData<UTCTimestamp>[];
  dark: boolean;
  showSma: boolean;
  levels: Level[];
  drawMode: boolean;
  onPlaceLevel: (price: number) => void;
  drawingTool: DrawingTool | null;
  drawings: Drawing[];
  drawingColor: string;
  magnetEnabled: boolean;
  studies: StudySettings;
  customStudies: CustomStudy[];
  parameters: StudyParameters;
  onAddDrawing: (drawing: Drawing) => void;
  onUpdateDrawing: (drawing: Drawing,editKind?:"move"|"start"|"end"|"control") => void;
  onDeleteDrawing: (id: string) => void;
  onDeleteDrawings: (ids:string[])=>void;
  selectedDrawingIds:string[];
  onDrawingSelectionChange:(ids:string[])=>void;
}
type Surface = ChartSurface;

export function ChartCanvas({
  paneId,onSurfaceReady,onRangeChanged,onCrosshairChanged,
  symbol, frame, source, chartStyle, candles, dark, showSma, levels, drawMode, onPlaceLevel,
  drawingTool, drawings, drawingColor, studies, customStudies, parameters, magnetEnabled, onAddDrawing, onUpdateDrawing, onDeleteDrawing, onDeleteDrawings, selectedDrawingIds, onDrawingSelectionChange
}: Props) {
  const callbacks=useRef({onSurfaceReady,onRangeChanged,onCrosshairChanged});
  callbacks.current={onSurfaceReady,onRangeChanged,onCrosshairChanged};
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const displaySeries=useRef<
    |{style:"ohlc-bars";series:ISeriesApi<"Bar">}
    |{style:"line";series:ISeriesApi<"Line">}
    |{style:"area";series:ISeriesApi<"Area">}
    |null
  >(null);
  const priceLineOwner=useRef<ISeriesApi<"Candlestick">|ISeriesApi<"Bar">|ISeriesApi<"Line">|ISeriesApi<"Area">|null>(null);
  const average = useRef<ISeriesApi<"Line"> | null>(null);
  const studyLines = useRef<{ ema?: ISeriesApi<"Line">; bb?: [ISeriesApi<"Line">, ISeriesApi<"Line">, ISeriesApi<"Line">] }>({});
  const priceLines = useRef<IPriceLine[]>([]);
  const formulaLines=useRef(new Map<string,ISeriesApi<"Line">>());
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
      visible:chartStyle==="candles"||chartStyle==="heikin-ashi",
      wickUpColor: "#22b98e", wickDownColor: "#e66a77",
      priceFormat: { type: "price", precision: symbols[symbol].precision, minMove: Math.pow(10, -symbols[symbol].precision) },
    });
    displaySeries.current=chartStyle==="ohlc-bars"?
      {style:"ohlc-bars",series:c.addSeries(BarSeries,{
        upColor:"#22b98e",downColor:"#e66a77",thinBars:true,openVisible:true,
        priceFormat:{type:"price",precision:symbols[symbol].precision,
          minMove:Math.pow(10,-symbols[symbol].precision)}
      })}:
      chartStyle==="line"?
      {style:"line",series:c.addSeries(LineSeries,{
        color:"#5fc3d5",lineWidth:2,
        priceFormat:{type:"price",precision:symbols[symbol].precision,
          minMove:Math.pow(10,-symbols[symbol].precision)}
      })}:
      chartStyle==="area"?
      {style:"area",series:c.addSeries(AreaSeries,{
        lineColor:"#5fc3d5",topColor:"rgba(95,195,213,.30)",bottomColor:"rgba(95,195,213,.02)",
        lineWidth:2,
        priceFormat:{type:"price",precision:symbols[symbol].precision,
          minMove:Math.pow(10,-symbols[symbol].precision)}
      })}:null;
    priceLineOwner.current=displaySeries.current?.series??s;
    average.current = showSma
      ? c.addSeries(LineSeries, { color: "#e1ad67", lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
      : null;
    const overlays: typeof studyLines.current = {};
    if (studies.ema20) overlays.ema = c.addSeries(LineSeries, {
      color:"#59c8d0",lineWidth:2,priceLineVisible:false,lastValueVisible:false
    });
    if (studies.bollinger20) overlays.bb = [
      c.addSeries(LineSeries,{color:"#a18ff0",lineWidth:1,priceLineVisible:false,lastValueVisible:false}),
      c.addSeries(LineSeries,{color:"#a18ff0",lineWidth:1,priceLineVisible:false,lastValueVisible:false}),
      c.addSeries(LineSeries,{color:"#a18ff0",lineWidth:1,priceLineVisible:false,lastValueVisible:false}),
    ];
    studyLines.current = overlays;
    const handleChartClick = (param: { point?: { y: number } }) => {
      if (!armed.current || !param.point) return;
      const value = s.coordinateToPrice(param.point.y);
      if (value !== null && Number.isFinite(value) && value > 0) callback.current(value);
    };
    c.subscribeClick(handleChartClick);
    const notifyRange=(range:ChartRange)=>callbacks.current.onRangeChanged?.(paneId,range);
    const notifyCrosshair=(event:{time?:unknown})=>{
      callbacks.current.onCrosshairChanged?.(paneId,typeof event.time==="number"?event.time:null);
    };
    c.timeScale().subscribeVisibleTimeRangeChange(notifyRange);
    c.subscribeCrosshairMove(notifyCrosshair);
    chart.current = c;
    series.current = s;
    setSurface({ chart: c, series: s });
    callbacks.current.onSurfaceReady?.(paneId,{chart:c,series:s});
    return () => {
      c.unsubscribeClick(handleChartClick);
      c.timeScale().unsubscribeVisibleTimeRangeChange(notifyRange);
      c.unsubscribeCrosshairMove(notifyCrosshair);
      callbacks.current.onSurfaceReady?.(paneId,null);
      priceLines.current = [];
      chart.current = null;
      series.current = null;
      displaySeries.current=null;
      priceLineOwner.current=null;
      average.current = null;
      studyLines.current = {};
      formulaLines.current.clear();
      c.remove();
    };
  }, [symbol, frame, dark, showSma, source, chartStyle, studies.ema20, studies.bollinger20, paneId]);

  useEffect(() => {
    if (!series.current) return;
    series.current.setData(chartStyle==="heikin-ashi"?heikinAshi(candles):candles);
    const display=displaySeries.current;
    if(display?.style==="ohlc-bars")display.series.setData(candles);
    else if(display?.style==="line"||display?.style==="area")
      display.series.setData(closeLineData(candles));
    if (average.current) average.current.setData(sma(candles, parameters.smaPeriod));
    studyLines.current.ema?.setData(ema(candles,parameters.emaPeriod));
    if(studyLines.current.bb){
      const bands=bollingerBands(candles,parameters.bollingerPeriod,parameters.bollingerDeviations);
      studyLines.current.bb[0].setData(bands.upper);
      studyLines.current.bb[1].setData(bands.middle);
      studyLines.current.bb[2].setData(bands.lower);
    }
    if (candles.length > 0 && !fitted.current) {
      chart.current?.timeScale().fitContent();
      fitted.current = true;
    }
  }, [candles, symbol, frame, dark, showSma, source, chartStyle, studies.ema20, studies.bollinger20, parameters]);

  useEffect(() => {
    const s = priceLineOwner.current;
    if (!s) return;
    for (const line of priceLines.current) s.removePriceLine(line);
    priceLines.current = levels.filter(l => l.symbol === symbol && (l.source ?? "demo") === source).map(level =>
      s.createPriceLine({ price: level.price, color: level.color, lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "LEVEL" })
    );
  }, [levels, symbol, frame, dark, showSma, source, chartStyle]);

  useEffect(()=>{
    const c=chart.current;
    if(!c)return;
    const enabled=customStudies.filter(study=>study.enabled);
    const ids=new Set(enabled.map(study=>study.id));
    for(const [id,line] of formulaLines.current){
      if(!ids.has(id)){
        c.removeSeries(line);formulaLines.current.delete(id);
      }
    }
    for(const study of enabled){
      let line=formulaLines.current.get(study.id);
      if(!line){
        line=c.addSeries(LineSeries,{
          color:study.color,lineWidth:2,priceLineVisible:false,lastValueVisible:false,
          title:study.name,
        });
        formulaLines.current.set(study.id,line);
      }
      line.applyOptions({color:study.color,title:study.name});
      try{line.setData(evaluateFormula(study.expression,candles));}
      catch{line.setData([]);}
    }
  },[customStudies,candles,symbol,frame,source,chartStyle,dark,showSma,studies.ema20,studies.bollinger20]);
  return <div className="technical-chart-stack" data-visible-candles={candles.length}><div className="chart-surface">
    <div ref={host} className={drawMode ? "chart-canvas drawing-armed" : "chart-canvas"}
      role="img" aria-label={(source==="demo"?"Synthetic ":"Binance Spot ")+
        symbols[symbol].label+" "+chartStyle+" chart"}/>
    {surface && surface.chart === chart.current && <DrawingOverlay
      chart={surface.chart} series={surface.series} symbol={symbol} frame={frame} candles={candles}
      tool={drawingTool} drawings={drawings} color={drawingColor} magnetEnabled={magnetEnabled}
      onAdd={onAddDrawing} onUpdate={onUpdateDrawing} onDelete={onDeleteDrawing}
      onDeleteMany={onDeleteDrawings}
      selectedIds={selectedDrawingIds} onSelectionChange={onDrawingSelectionChange}
    />}
  </div>
  {surface && surface.chart === chart.current && <IndicatorPanels
    chart={surface.chart} candles={candles} dark={dark} studies={studies} parameters={parameters}
  />}
  </div>;
}
