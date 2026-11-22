import { ArrowUpRight, Calculator, Check, Info, RotateCcw, Target, Wallet } from "lucide-react";
import { calculateRiskPlan, emptyRiskInputs, type RiskPlan, type RiskPlannerInputs } from "./risk";
import { symbols, type SymbolId } from "../market";

interface Props {
  value: RiskPlannerInputs;
  onChange: (next: RiskPlannerInputs) => void;
  symbol: SymbolId;
  quotePrice: number;
  sourceLabel: string;
}

type Key = keyof RiskPlannerInputs;
const fields: {key: Key; label: string; placeholder: string; hint: string}[] = [
  {key:"equity",label:"Capital / equity",placeholder:"10,000",hint:"Same currency as the quote"},
  {key:"riskPercent",label:"Risk allocation (%)",placeholder:"1",hint:"Percent of entered equity"},
  {key:"entry",label:"Proposed entry",placeholder:"100.00",hint:"Manual or loaded from chart"},
  {key:"stop",label:"Protective stop-loss",placeholder:"98.00",hint:"Determines long vs short"},
  {key:"target",label:"Take-profit (optional)",placeholder:"105.00",hint:"Estimate potential reward"},
  {key:"multiplier",label:"Value per price point",placeholder:"1",hint:"Broker contract multiplier; defaults to one"},
];
const format = (number: number, decimals = 2) =>
  number.toLocaleString(undefined, {maximumFractionDigits: decimals, minimumFractionDigits: decimals});

export function RiskPlanner({ value, onChange, symbol, quotePrice, sourceLabel }: Props) {
  const set = (key: Key, next: string) => onChange({...value, [key]: next});
  const ready = !!(value.equity.trim() && value.entry.trim() && value.stop.trim() && value.riskPercent.trim() && value.multiplier.trim());
  let plan: RiskPlan | null = null;
  let error: string | null = null;
  if (ready) {
    try {plan = calculateRiskPlan(value);}
    catch (cause) {error = cause instanceof Error ? cause.message : "Review the entered numbers.";}
  }
  const currency = symbol === "BTCUSDT" ? "USDT" : "USD";

  return <div className="content-page risk-screen">
    <div className="risk-intro">
      <div>
        <div className="eyebrow">TRADING TOOLS / RISK PLANNER</div>
        <h1>Plan risk before entry.</h1>
        <p>Explore position size, potential loss and reward using your own assumptions. No orders are placed, and these calculations are independent of broker execution.</p>
      </div>
      <div className="risk-intro-icon"><Calculator size={25}/></div>
    </div>

    <div className="risk-workspace-grid">
      <section className="risk-input-panel" aria-label="Risk planning parameters">
        <div className="risk-section-head">
          <div><span className="eyebrow">01 / PARAMETERS</span><h2>Trade setup</h2></div>
          <button className="risk-reset" onClick={() => onChange({...emptyRiskInputs})}><RotateCcw size={14}/> Reset</button>
        </div>
        <div className="risk-instrument-strip">
          <div><span>REFERENCE INSTRUMENT</span><strong>{symbols[symbol].label}</strong></div>
          <div><span>ESTIMATED QUOTE CURRENCY</span><strong>{currency}</strong></div>
        </div>
        <div className="risk-form-grid">
          {fields.map(field => <label key={field.key} className="risk-field">
            <span>{field.label}</span>
            <input type="number" inputMode="decimal" min={field.key==="target" ? "0" : "0.00000001"}
              step="any" value={value[field.key]} placeholder={field.placeholder}
              onChange={event => set(field.key,event.target.value)} />
            <small>{field.hint}</small>
          </label>)}
        </div>
        <div className="risk-chart-link">
          <div><strong>Chart-linked entry</strong><small>{sourceLabel}</small></div>
          <button disabled={!Number.isFinite(quotePrice) || quotePrice <= 0}
            onClick={() => set("entry",String(quotePrice))}>
            Use shown price <ArrowUpRight size={15}/>
          </button>
        </div>
        <div className="risk-footnote"><Info size={16}/><span>Risk calculations assume a linear instrument, quote-currency equity and the multiplier you enter. They exclude slippage, spread, fees, margin rules and currency conversion. Check broker specifications before trading.</span></div>
      </section>
      <section className="risk-results-panel" aria-label="Risk planning results" aria-live="polite">
        <div className="risk-section-head">
          <div><span className="eyebrow">02 / ESTIMATES</span><h2>Position analysis</h2></div>
          {plan && <span className="risk-valid"><Check size={14}/> Calculated</span>}
        </div>
        {plan ? <>
          <div className="risk-direction"><span>{plan.side === "long" ? "LONG SETUP" : "SHORT SETUP"}</span><strong>{format(plan.rewardToRisk ?? 0,2)}R <small>{plan.rewardToRisk === null ? "TARGET NOT SET" : "POTENTIAL"}</small></strong></div>
          <div className="risk-primary-result"><span>THEORETICAL POSITION UNITS</span><strong>{format(plan.positionUnits,6)}</strong><small>Assuming a per-unit contract multiplier of {value.multiplier}</small></div>
          <div className="risk-result-grid">
            <div><Wallet size={18}/><span>Risk budget</span><strong>{format(plan.riskCash)} {currency}</strong></div>
            <div><Target size={18}/><span>Entry–stop distance</span><strong>{format(plan.lossDistance, 6)}</strong></div>
            <div><span className="risk-loss-dot"/><span>Potential stop loss</span><strong>−{format(plan.hypotheticalLoss)} {currency}</strong></div>
            <div><span className="risk-gain-dot"/><span>Potential target gain</span><strong>{plan.potentialProfit === null ? "Not specified" : "+"+format(plan.potentialProfit)+" "+currency}</strong></div>
          </div>
          <div className="risk-result-summary">
            <span>Estimated notional exposure</span><strong>{format(plan.effectiveExposure)} {currency}</strong>
          </div>
          <p className="risk-output-note">Illustrative planning values only. Actual lot steps, tick/pip value, margin, liquidity and execution depend on your instrument and broker.</p>
        </> : <div className="risk-empty-result">
          <div className="risk-empty-symbol"><Target size={33}/></div>
          <h3>{error ? "Review these inputs" : "Your analysis will appear here."}</h3>
          <p>{error || "Enter capital, risk percentage, entry and stop-loss to calculate a theoretical position size. Add a take-profit to see the estimated reward-to-risk ratio."}</p>
        </div>}
      </section>
    </div>
  </div>;
}
