import {useMemo} from "react";
import type {Drawing} from "./types";
import {calculatePositionMetrics,defaultPositionSettings,effectivePositionSettings,formatPositionCash,
 type PositionSettings} from "../analysis/positionMetrics";
import {defaultPositionTarget} from "../analysis/positionDrawing";
import "./positionProperties.css";

type Props={drawing:Drawing;onChange:(drawing:Drawing)=>void};
type NumericKey=Exclude<keyof PositionSettings,"sizing"|"accountCurrency"|"showPnl"|"showPriceChange"|"showQuantity">;
const fields:{key:NumericKey;label:string;hint:string;min:number;max:number;step:string}[]=[
 {key:"equity",label:"Account equity",hint:"In the account currency below",min:.01,max:1e15,step:"any"},
 {key:"riskPercent",label:"Risk allocation (%)",hint:"Used to size by stop-loss risk",min:.000001,max:100,step:"any"},
 {key:"quantity",label:"Fixed position quantity",hint:"Number of units or contracts",min:.000000000001,max:1e12,step:"any"},
 {key:"contractMultiplier",label:"Contract multiplier",hint:"Quote-currency value of a 1-point move per unit",min:.000000000001,max:1e12,step:"any"},
 {key:"tickSize",label:"Minimum price tick",hint:"Manual instrument tick size; not a pip conversion",min:.000000000001,max:1e12,step:"any"},
 {key:"feeBps",label:"Fee per side (basis points)",hint:"1 bp = 0.01%; applied to entry and exit notionals",min:0,max:1000,step:"any"},
 {key:"slippageTicks",label:"Adverse slippage (ticks per side)",hint:"Applied on entry and stop/target exits",min:0,max:1000,step:"any"},
 {key:"leverage",label:"Illustrative leverage",hint:"Used only for estimated initial margin",min:1,max:1000,step:"any"},
 {key:"quoteToAccountRate",label:"Quote → account conversion",hint:"Account units per 1 quote-currency unit; manual",min:.000000000001,max:1e9,step:"any"},
];
const money=(v:number,c:string)=>formatPositionCash(v,c);
const number=(v:number,digits=4)=>v.toLocaleString(undefined,{maximumFractionDigits:digits});
export function PositionProperties({drawing,onChange}:Props){
 const settings=effectivePositionSettings(drawing.positionSettings,drawing.symbol);
 const update=(patch:Partial<PositionSettings>)=>onChange({...drawing,positionSettings:{...settings,...patch}});
 const isPosition=drawing.tool==="long-position"||drawing.tool==="short-position";
 const target=isPosition?(drawing.target?.price??defaultPositionTarget(drawing.tool as "long-position"|"short-position",drawing.start.price,drawing.end.price)):null;
 const result=useMemo(()=>isPosition&&target!==null?
   calculatePositionMetrics(drawing.tool as "long-position"|"short-position",
     drawing.start.price,drawing.end.price,target,settings):null,
   [drawing.tool,drawing.start.price,drawing.end.price,target,settings]);
 if(!isPosition)return null;
 return <section className="position-properties" aria-label="Position planning settings">
   <div className="position-properties-intro">
     <strong>Position planning · no trade execution</strong>
     <p>These are theoretical linear-contract estimates, not live broker orders or guaranteed P&amp;L. Specify your broker's multiplier, tick size, currency conversion, fees and slippage.</p>
   </div>
   <div className="position-properties-prices">
     <div><span>Entry</span><strong>{number(drawing.start.price,8)}</strong></div>
     <div><span>Protective stop</span><strong>{number(drawing.end.price,8)}</strong></div>
     <div><span>Profit target</span><strong>{target===null?"Invalid stop":number(target,8)}</strong></div>
   </div>
   <p className="position-properties-help">Edit entry, stop and target on the Coordinates tab or drag their chart handles. The target defaults to 2R until explicitly changed.</p>
   <div className="position-properties-group">
     <h3>Account and position sizing</h3>
     <div className="position-properties-sizing" role="group" aria-label="Position sizing mode">
       <button type="button" className={settings.sizing==="risk"?"selected":""}
         aria-pressed={settings.sizing==="risk"} onClick={()=>update({sizing:"risk"})}>Size by risk budget</button>
       <button type="button" className={settings.sizing==="quantity"?"selected":""}
         aria-pressed={settings.sizing==="quantity"} onClick={()=>update({sizing:"quantity"})}>Fixed quantity</button>
     </div>
     <div className="position-properties-grid">
       {fields.slice(0,3).map(field=><label key={field.key}>
         <span>{field.label}</span><input type="number" inputMode="decimal" step={field.step}
           min={field.min} max={field.max} value={settings[field.key]}
           disabled={field.key==="quantity"&&settings.sizing!=="quantity"}
           aria-label={field.label}
           onChange={e=>update({[field.key]:Number(e.target.value)})}/>
         <small>{field.hint}</small>
       </label>)}
       <label><span>Account currency</span><input type="text" maxLength={8}
         aria-label="Account currency" value={settings.accountCurrency}
         onChange={e=>update({accountCurrency:e.target.value.toUpperCase()})}/>
         <small>Three to eight uppercase letters (e.g. USD, USDT)</small>
       </label>
     </div>
   </div>
   <div className="position-properties-group">
     <h3>Contract, costs and margin</h3>
     <div className="position-properties-grid">
       {fields.slice(3).map(field=><label key={field.key}>
         <span>{field.label}</span><input type="number" inputMode="decimal" step={field.step}
           min={field.min} max={field.max} value={settings[field.key]} aria-label={field.label}
           onChange={e=>update({[field.key]:Number(e.target.value)})}/>
         <small>{field.hint}</small>
       </label>)}
     </div>
   </div>
   <div className="position-properties-group">
     <h3>Chart labels</h3>
     <div className="position-properties-labels">
       {([
         ["showPnl","Net monetary P&L"],
         ["showPriceChange","Price change, % and ticks"],
         ["showQuantity","Position quantity"]
       ] as const).map(([key,label])=><label key={key}>
         <input type="checkbox" checked={settings[key]} onChange={e=>update({[key]:e.target.checked})}/>
         <span>{label}</span>
       </label>)}
     </div>
   </div>
   <div className="position-properties-group position-properties-results" aria-live="polite">
     <h3>Calculated position outcomes</h3>
     {result?<>
       <dl>
         <div><dt>Position size</dt><dd>{number(result.quantity,8)} units</dd></div>
         <div><dt>Risk budget</dt><dd>{money(result.riskBudget,result.currency)}</dd></div>
         <div><dt>Estimated stop loss, after costs</dt><dd className="negative">{money(-result.estimatedLoss,result.currency)}</dd></div>
         <div><dt>Estimated target profit, after costs</dt><dd className={result.estimatedProfit>=0?"positive":"negative"}>{money(result.estimatedProfit,result.currency)}</dd></div>
         <div><dt>Net reward / risk</dt><dd>{number(result.netMultiple,3)}R</dd></div>
         <div><dt>Gross reward / risk</dt><dd>{number(result.grossMultiple,3)}R</dd></div>
         <div><dt>Actual account risk</dt><dd>{number(result.actualRiskPercent,4)}%</dd></div>
         <div><dt>Notional exposure</dt><dd>{money(result.notional,result.currency)}</dd></div>
         <div><dt>Estimated initial margin</dt><dd>{money(result.margin,result.currency)}</dd></div>
         <div><dt>Stop distance</dt><dd>{number(result.stopPercent,4)}% · {number(result.stopTicks,3)} ticks</dd></div>
         <div><dt>Target distance</dt><dd>{number(result.targetPercent,4)}% · {number(result.targetTicks,3)} ticks</dd></div>
         <div><dt>Stop-side total costs</dt><dd>{money(result.roundTripStopCosts,result.currency)}</dd></div>
         <div><dt>Target-side total costs</dt><dd>{money(result.roundTripTargetCosts,result.currency)}</dd></div>
         <div><dt>Estimated break-even price</dt><dd>{number(result.breakEvenPrice,8)}</dd></div>
       </dl>
       {result.exceedsEquityMargin&&<p role="alert" className="position-properties-warning">
         Estimated initial margin exceeds entered account equity. This position may not be feasible under broker margin rules.
       </p>}
       {result.estimatedProfit<=0&&<p role="alert" className="position-properties-warning">
         Fees and slippage exceed the gross target gain; the estimated net outcome is non-positive.
       </p>}
     </>:<p role="alert" className="position-properties-warning">
       Check entry, stop, target and numerical settings. For a long, stop must be below entry and target above; reverse these for a short.
     </p>}
     <button type="button" className="position-properties-reset"
       onClick={()=>update(defaultPositionSettings(drawing.symbol))}>Reset position assumptions</button>
   </div>
 </section>;
}
