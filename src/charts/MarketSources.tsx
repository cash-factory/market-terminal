import {useState} from "react";
import {externalProviders, symbols, type SymbolId} from "../market";

const chartUrl = (symbol: string) =>
  "https://www.tradingview.com/chart/?symbol=" + encodeURIComponent(symbol);

export function MarketSources() {
  const [custom, setCustom] = useState("");
  const ticker = custom.trim().toUpperCase();
  return <details className="market-session-reference market-source-links">
    <summary><span>External chart sources</span><strong>Choose provider</strong></summary>
    <p>Charts open on TradingView. Prices, trading hours and delays depend on the source.
      External prices stay on TradingView. Terminal alerts and replay use the terminal feed.</p>
    <nav aria-label="External chart providers">
      {Object.entries(externalProviders).map(([symbol, providers]) =>
        <section key={symbol}><strong>{symbols[symbol as SymbolId].label}</strong>
          <ul>{providers.map(([label, id]) => <li key={id}>
            <a href={chartUrl(id)} target="_blank" rel="noopener noreferrer">{label}</a>
          </li>)}</ul>
        </section>)}
    </nav>
    <label>Other TradingView instrument
      <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="Exchange:symbol" />
    </label>
    {/^[A-Z0-9_]+:[A-Z0-9._!-]+$/.test(ticker) &&
      <a href={chartUrl(ticker)} target="_blank" rel="noopener noreferrer">Open {ticker} on TradingView</a>}
  </details>;
}
