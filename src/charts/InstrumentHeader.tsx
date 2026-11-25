import {InstrumentIcon} from "../presentation/InstrumentIcon";
import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { symbols, type SymbolId, type Frame } from "../market";

type Props = {
  symbol: SymbolId;
  frame: Frame;
  candles: readonly CandlestickData<UTCTimestamp>[];
  source: string;
  onSearch: () => void;
};

export type CandleInspector = {inspect:(time:number|null)=>void};
export const InstrumentHeader = forwardRef<CandleInspector,Props>(function InstrumentHeader(
  {symbol,frame,candles,source,onSearch},ref
) {
  const [cursorTime,inspect] = useState<number|null>(null);
  useImperativeHandle(ref,()=>({inspect}),[]);
  const byTime=useMemo(()=>new Map<number,number>(candles.map((bar,index)=>[bar.time,index])),[candles]);
  const cursorIndex=cursorTime===null?undefined:byTime.get(cursorTime);
  const index=cursorIndex ?? candles.length-1;
  const instrument=symbols[symbol];
  const bar=candles[index];
  const previous=candles[index-1];
  const change=bar && previous ? (bar.close / previous.close - 1) * 100 : undefined;
  const format=(value?:number)=>value===undefined ? "—" : value.toFixed(instrument.precision);
  return <header className="instrument-header">
    <div><div className="instrument-meta">{instrument.market.split(" · ")[0]} <span> / </span> {frame.toUpperCase()}</div>
      <h1><button onClick={onSearch} aria-label="Choose chart instrument"><InstrumentIcon symbol={symbol} size={22}/>{instrument.label}<ChevronDown size={18}/></button></h1>
    </div>
    <div className="instrument-quote"><small>{source}</small><strong>{format(candles.at(-1)?.close)}</strong></div>
    <div className="candle-reader">
      <span className="candle-time">{cursorIndex===undefined?"Latest candle":"Crosshair"}{bar && " · "+new Date(Number(bar.time)*1000).toISOString().slice(5,16).replace("T"," ")+" UTC"}</span>
    <dl aria-label="Inspected candle">
      {([["Open",bar?.open],["High",bar?.high],["Low",bar?.low],["Close",bar?.close]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{format(value)}</dd></div>)}
      <div><dt>Bar change</dt><dd className={change===undefined?"":change>=0?"quote-up":"quote-down"}>{change===undefined?"—":(change>=0?"+":"")+change.toFixed(2)+"%"}</dd></div>
    </dl></div>
  </header>;
});
