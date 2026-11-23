import {useMemo,useState} from "react";
import {BookmarkCheck,ChevronRight,FlaskConical,RotateCcw} from "lucide-react";
import type {ReplayState} from "./model";
import {archiveReplayStudy,createReplayScenario,evaluateReplayScenario,type ReplayScenario,type SavedReplayStudy,type SimulationSide} from "./simulation";
import "./replayLab.css";

type Props={replay:ReplayState;onSave:(study:SavedReplayStudy)=>void};
const asCurrency=(n:number)=>n.toLocaleString(undefined,{maximumFractionDigits:2});
export function ReplayLab({replay,onSave}:Props){
 const reference=replay.snapshot[replay.cursor]?.close??0;
 const [side,setSide]=useState<SimulationSide>("long");
 const [stop,setStop]=useState("");
 const [target,setTarget]=useState("");
 const [equity,setEquity]=useState("10000");
 const [risk,setRisk]=useState("1");
 const [multiplier,setMultiplier]=useState("1");
 const [active,setActive]=useState<ReplayScenario|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [saved,setSaved]=useState<string|null>(null);
 const result=useMemo(()=>active?evaluateReplayScenario(replay,active):null,[replay,active]);
 const start=()=>{
   try{
     setActive(createReplayScenario(replay,{
       side,stop:Number(stop),target:Number(target),equity:Number(equity),
       riskPercent:Number(risk),contractMultiplier:Number(multiplier)
     },crypto.randomUUID()));
     setError(null);setSaved(null);
   }catch(cause){setError(cause instanceof Error?cause.message:"Review simulation inputs.");}
 };
 const reset=()=>{setActive(null);setSaved(null);setError(null);};
 const statusText=result?.status==="armed"?"Armed · next candle open":result?.status==="open"?"Open · mark to market":
   result?.status==="stopped"?"Stopped · hypothetical":result?.status==="target"?"Target reached · hypothetical":
   "Invalidated · opening gap";
 return <section className="peak-replay-lab" aria-label="Structured replay simulation">
  <div className="peak-lab-heading"><FlaskConical size={16}/><div><strong>Simulation lab</strong>
    <small>Scenario decisions use only candles revealed so far</small></div></div>
  {!active?<div className="peak-lab-form">
    <div className="peak-lab-pair"><label>Direction<select aria-label="Simulation direction" value={side}
      onChange={event=>setSide(event.target.value as SimulationSide)}>
      <option value="long">Long</option><option value="short">Short</option>
    </select></label><div className="peak-lab-reference"><span>Last observed close</span>
      <strong>{reference.toLocaleString(undefined,{maximumFractionDigits:6})}</strong></div></div>
    <div className="peak-lab-grid">
      <label>Stop<input aria-label="Simulation stop" inputMode="decimal" type="number" min="0" step="any" value={stop} onChange={event=>setStop(event.target.value)} placeholder={side==="long"?"Below close":"Above close"}/></label>
      <label>Target<input aria-label="Simulation target" inputMode="decimal" type="number" min="0" step="any" value={target} onChange={event=>setTarget(event.target.value)} placeholder={side==="long"?"Above close":"Below close"}/></label>
      <label>Illustrative equity<input aria-label="Simulation equity" inputMode="decimal" type="number" min="0" step="any" value={equity} onChange={event=>setEquity(event.target.value)}/></label>
      <label>Risk %<input aria-label="Simulation risk percent" inputMode="decimal" type="number" min="0" max="100" step="any" value={risk} onChange={event=>setRisk(event.target.value)}/></label>
      <label>Value per price unit<input aria-label="Simulation contract multiplier" inputMode="decimal" type="number" min="0" step="any" value={multiplier} onChange={event=>setMultiplier(event.target.value)}/></label>
    </div>
    {error&&<p className="peak-lab-error" role="alert">{error}</p>}
    <button className="peak-lab-primary" type="button" onClick={start}
      disabled={replay.cursor>=replay.snapshot.length-1}>Arm next-bar scenario <ChevronRight size={15}/></button>
  </div>:<div className="peak-lab-result" aria-live="polite">
    <div className="peak-lab-status"><strong>{statusText}</strong><span>{active.side.toUpperCase()}</span></div>
    <div className="peak-lab-metrics">
      <div><small>Entry fill</small><strong>{result?.entryPrice===null?"Awaiting next open":result?.entryPrice.toLocaleString(undefined,{maximumFractionDigits:6})}</strong></div>
      <div><small>Hypothetical units</small><strong>{result?.quantity==null?"Pending":result.quantity.toLocaleString(undefined,{maximumFractionDigits:6})}</strong></div>
      <div><small>Risk budget</small><strong>{asCurrency(result?.riskCash??0)}</strong></div>
      <div><small>{result?.status==="open"?"Unrealized P/L":"Hypothetical P/L"}</small><strong>{result?.pnl==null?"—":asCurrency(result.pnl)}</strong></div>
      <div><small>Price-based R</small><strong>{result?.rMultiple==null?"—":result.rMultiple.toFixed(2)+"R"}</strong></div>
    </div>
    {result?.reason&&<p className="peak-lab-reason">{result.reason}</p>}
    <div className="peak-lab-actions">
      <button type="button" onClick={reset}><RotateCcw size={13}/> New scenario</button>
      {result&&["target","stopped","invalidated"].includes(result.status)&&<button
        type="button" disabled={saved===active.id} onClick={()=>{
          onSave(archiveReplayStudy(replay,active,result,Date.now()));setSaved(active.id);
        }}><BookmarkCheck size={14}/>{saved===active.id?"Saved to workspace":"Save study"}</button>}
    </div>
  </div>}
  <p className="peak-lab-caveat">Illustrative OHLC simulation: next-bar market entry, conservative stop-first when both levels touch. No spread, slippage, fees, FX conversion or executable orders. Unit value and equity are manual assumptions.</p>
 </section>;
}
