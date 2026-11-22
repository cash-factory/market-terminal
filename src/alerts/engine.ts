import type { SymbolId } from "../market";
import type { PriceSource } from "../data/usePriceFeed";

/** Local in-tab price crossing. This does not constitute background or server monitoring. */
export type PriceAlert = {
  id: string;
  symbol: SymbolId;
  source: PriceSource;
  direction: "above" | "below";
  price: number;
  createdAtMs: number;
  triggeredAtMs: number | null;
};
const symbolIds=new Set<SymbolId>(["EURUSD","BTCUSDT","AAPL","US100"]);
const validSource=new Set<PriceSource>(["demo","binance"]);
export function isPriceAlert(value:unknown):value is PriceAlert{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const a=value as Partial<PriceAlert>;
  return typeof a.id==="string"&&a.id.length>0&&a.id.length<=128&&
    symbolIds.has(a.symbol as SymbolId)&&validSource.has(a.source as PriceSource)&&
    (a.source!=="binance"||a.symbol==="BTCUSDT")&&
    (a.direction==="above"||a.direction==="below")&&
    typeof a.price==="number"&&Number.isFinite(a.price)&&a.price>0&&
    typeof a.createdAtMs==="number"&&Number.isSafeInteger(a.createdAtMs)&&a.createdAtMs>=0&&
    (a.triggeredAtMs===null||
      (typeof a.triggeredAtMs==="number"&&Number.isSafeInteger(a.triggeredAtMs)&&a.triggeredAtMs>=a.createdAtMs));
}
export function createPriceAlert(
  symbol:SymbolId,source:PriceSource,direction:PriceAlert["direction"],
  price:number,id:string,nowMs:number
):PriceAlert {
  const value:PriceAlert={id,symbol,source,direction,price,createdAtMs:nowMs,triggeredAtMs:null};
  if(!isPriceAlert(value))throw new Error("Please enter a valid positive threshold for the selected market.");
  return value;
}

export function crossedThreshold(
  direction:PriceAlert["direction"],threshold:number,
  previous:number,current:number
):boolean{
  if(!Number.isFinite(previous)||!Number.isFinite(current)||!Number.isFinite(threshold))return false;
  return direction==="above"?
    previous<threshold&&current>=threshold:
    previous>threshold&&current<=threshold;
}

/** Returns original array when no alerts cross; avoids needless React persistence updates. */
export function evaluatePriceAlerts(
  alerts:readonly PriceAlert[],symbol:SymbolId,source:PriceSource,
  previous:number,current:number,nowMs:number
):{updated:PriceAlert[];triggered:PriceAlert[]} {
  const triggered:PriceAlert[]=[];
  const updated=alerts.map(alert=>{
    if(alert.triggeredAtMs!==null||alert.symbol!==symbol||alert.source!==source||
       !crossedThreshold(alert.direction,alert.price,previous,current))return alert;
    const active={...alert,triggeredAtMs:Math.max(nowMs,alert.createdAtMs)};
    triggered.push(active);
    return active;
  });
  return {updated:triggered.length?updated:[...alerts],triggered};
}
