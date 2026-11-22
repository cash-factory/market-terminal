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

export function InstrumentHeader({symbol,frame,candles,source,onSearch}:Props) {
  const instrument=symbols[symbol];
  const bar=candles.at(-1);
  const previous=candles.at(-2);
  const change=bar && previous ? (bar.close / previous.close - 1) * 100 : undefined;
  const format=(value?:number)=>value===undefined ? "—" : value.toFixed(instrument.precision);
  return <header className="instrument-header">
    <div><div className="instrument-meta">{instrument.market.split(" · ")[0]} <span> / </span> {frame.toUpperCase()}</div>
      <h1><button onClick={onSearch} aria-label="Choose chart instrument">{instrument.label}<ChevronDown size={18}/></button></h1>
    </div>
    <div className="instrument-quote"><small>{source}</small><strong>{format(bar?.close)}</strong></div>
    <dl aria-label="Latest displayed candle">
      {([["Open",bar?.open],["High",bar?.high],["Low",bar?.low]] as const).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{format(value)}</dd></div>)}
      <div><dt>Bar change</dt><dd className={change===undefined?"":change>=0?"quote-up":"quote-down"}>{change===undefined?"—":(change>=0?"+":"")+change.toFixed(2)+"%"}</dd></div>
    </dl>
  </header>;
}
