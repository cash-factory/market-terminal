import { useEffect, useRef, useState } from "react";
import {
  createChart, HistogramSeries, LineSeries,
  type CandlestickData, type IChartApi, type ISeriesApi, type UTCTimestamp
} from "lightweight-charts";
import { atr, macd, rsi, type StudySettings } from "./studies";
import type { StudyParameters } from "./parameters";

type PaneKey = "rsi14" | "macd" | "atr14";
type PaneSurface = { chart: IChartApi; parent:IChartApi; lines: ISeriesApi<"Line">[]; histogram: ISeriesApi<"Histogram"> | null };
type PaneProps = {
  kind:PaneKey;
  candles:readonly CandlestickData<UTCTimestamp>[];
  priceChart:IChartApi;
  dark:boolean;
  parameters:StudyParameters;
};
const definitions:Record<PaneKey,{title:string;color:string}> = {
  rsi14:{title:"RSI · 14",color:"#a69cf7"},
  macd:{title:"MACD · 12 / 26 / 9",color:"#57bdd5"},
  atr14:{title:"ATR · 14",color:"#e2b16c"}
};

function IndicatorPane({kind,candles,priceChart,dark,parameters}:PaneProps){
  const host=useRef<HTMLDivElement>(null);
  const [pane,setPane]=useState<PaneSurface|null>(null);
  const hasFit=useRef(false);

  useEffect(()=>{
    if(!host.current)return;
    hasFit.current=false;
    const c=createChart(host.current,{
      autoSize:true,
      layout:{background:{color:dark?"#101821":"#fff"},textColor:dark?"#8e9bad":"#64748b",fontSize:10},
      grid:{
        vertLines:{color:dark?"#202d39":"#edf1f5"},
        horzLines:{color:dark?"#202d39":"#edf1f5"}
      },
      rightPriceScale:{borderColor:dark?"#293644":"#dce4eb",scaleMargins:{top:.12,bottom:.12}},
      timeScale:{borderColor:dark?"#293644":"#dce4eb",visible:false},
      crosshair:{horzLine:{labelVisible:true}},
    });
    const lines:ISeriesApi<"Line">[]=[];
    let histogram:ISeriesApi<"Histogram">|null=null;
    if(kind==="rsi14"){
      const line=c.addSeries(LineSeries,{color:"#a69cf7",lineWidth:2,priceLineVisible:false,lastValueVisible:true});
      line.createPriceLine({price:70,color:"#a86977",lineStyle:2,lineWidth:1,axisLabelVisible:true,title:"70"});
      line.createPriceLine({price:30,color:"#3aaa92",lineStyle:2,lineWidth:1,axisLabelVisible:true,title:"30"});
      lines.push(line);
    }else if(kind==="atr14"){
      lines.push(c.addSeries(LineSeries,{color:"#e2b16c",lineWidth:2,priceLineVisible:false}));
    }else{
      histogram=c.addSeries(HistogramSeries,{priceLineVisible:false,lastValueVisible:false});
      histogram.createPriceLine({price:0,color:dark?"#687482":"#a2acb5",lineStyle:2,lineWidth:1,axisLabelVisible:false});
      lines.push(c.addSeries(LineSeries,{color:"#57bdd5",lineWidth:2,priceLineVisible:false}));
      lines.push(c.addSeries(LineSeries,{color:"#e2b16c",lineWidth:2,priceLineVisible:false}));
    }
    const sync=()=>{
      const range=priceChart.timeScale().getVisibleRange();
      if(range) {
        try{c.timeScale().setVisibleRange(range);}
        catch { /* chart data may still be loading */ }
      }
    };
    priceChart.timeScale().subscribeVisibleTimeRangeChange(sync);
    setPane({chart:c,parent:priceChart,lines,histogram});
    return()=>{
      priceChart.timeScale().unsubscribeVisibleTimeRangeChange(sync);
      c.remove();
    };
  },[kind,dark,priceChart]);

  useEffect(()=>{
    if(!pane || pane.parent!==priceChart)return;
    if(kind==="rsi14")pane.lines[0].setData(rsi(candles,parameters.rsiPeriod));
    if(kind==="atr14")pane.lines[0].setData(atr(candles,parameters.atrPeriod));
    if(kind==="macd"){
      const data=macd(candles,parameters.macdFast,parameters.macdSlow,parameters.macdSignal);
      pane.lines[0].setData(data.macd);
      pane.lines[1].setData(data.signal);
      pane.histogram?.setData(data.histogram);
    }
    if(candles.length && !hasFit.current) {
      pane.chart.timeScale().fitContent();
      hasFit.current=true;
    }
    const range=priceChart.timeScale().getVisibleRange();
    if(range){
      try{pane.chart.timeScale().setVisibleRange(range);}
      catch{/* visual sync waits for valid data */}
    }
  },[pane,candles,kind,priceChart,parameters]);

  const displayTitle=kind==="rsi14"?"RSI · "+parameters.rsiPeriod:
    kind==="atr14"?"ATR · "+parameters.atrPeriod:
    "MACD · "+parameters.macdFast+" / "+parameters.macdSlow+" / "+parameters.macdSignal;
  return <section className="indicator-pane" aria-label={displayTitle}>
    <div className="indicator-pane-label"><span className="indicator-pane-dot" style={{background:definitions[kind].color}}/>{displayTitle}</div>
    <div ref={host} className="indicator-pane-canvas" role="img" aria-label={displayTitle+" chart"}/>
  </section>;
}

export type IndicatorPanelsProps={
  studies: StudySettings;
  candles:readonly CandlestickData<UTCTimestamp>[];
  chart:IChartApi;
  dark:boolean;
  parameters:StudyParameters;
};
export function IndicatorPanels({studies,candles,chart,dark,parameters}:IndicatorPanelsProps){
  const selected:PaneKey[]=[];
  if(studies.rsi14)selected.push("rsi14");
  if(studies.macd)selected.push("macd");
  if(studies.atr14)selected.push("atr14");
  if(!selected.length)return null;
  return <div className="indicator-panes">
    {selected.map(kind=><IndicatorPane key={kind} kind={kind} candles={candles} priceChart={chart} dark={dark} parameters={parameters}/>)}
  </div>;
}
