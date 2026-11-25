import {isRealSpotSymbol, type SymbolId} from "../market";

export function InstrumentIcon({symbol, size}: {symbol: SymbolId; size: number}) {
  if (!isRealSpotSymbol(symbol)) return null;
  const asset = symbol.slice(0, -4).toLowerCase();
  return <img src={import.meta.env.BASE_URL + "assets/instruments/" + asset + ".svg"}
    width={size} height={size} alt="" />;
}
