import {useState} from "react";
import {externalProviders, type SymbolId} from "../market";

const chartUrl = (symbol: string) =>
  "https://www.tradingview.com/chart/?symbol=" + encodeURIComponent(symbol);

export function MarketSources({symbol}: {symbol: SymbolId}) {
  const [custom, setCustom] = useState("");
  const ticker = custom.trim().toUpperCase();
  return <details className="market-session-reference market-source-links">
    <summary><span>External chart sources</span><strong>Choose provider</strong></summary>
    <p>Charts open on TradingView. Prices, trading hours and delays depend on the source.
      External prices stay on TradingView. Terminal alerts and replay use the terminal feed.</p>
    <nav aria-label="External chart providers">
      {externalProviders[symbol]?.map(([label, id]) =>
        <a key={id} href={chartUrl(id)} target="_blank" rel="noopener noreferrer">{label}</a>)}
    </nav>
    <label>Other TradingView instrument
      <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Exchange:symbol" />
    </label>
    {/^[A-Z0-9_]+:[A-Z0-9._!-]+$/.test(ticker) &&
      <a href={chartUrl(ticker)} target="_blank" rel="noopener noreferrer">Open {ticker} on TradingView</a>}
  </details>;
}
