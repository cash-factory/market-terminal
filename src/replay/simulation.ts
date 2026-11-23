import type {ReplayState} from "./model";
import {ALL_FRAMES,symbols,type Frame,type SymbolId} from "../market";
import type {PriceSource} from "../data/usePriceFeed";

export type SimulationSide="long"|"short";
export type ScenarioInput={side:SimulationSide;stop:number;target:number;equity:number;riskPercent:number;contractMultiplier:number};
export type ReplayScenario=ScenarioInput&{
 id:string;symbol:SymbolId;frame:Frame;source:PriceSource;createdCursor:number;createdTime:number;referenceClose:number;
};
export type SimulationStatus="armed"|"open"|"target"|"stopped"|"invalidated";
export type SimulationEvaluation={
 status:SimulationStatus;entryPrice:number|null;exitPrice:number|null;quantity:number|null;
 riskCash:number;pnl:number|null;rMultiple:number|null;exitCursor:number|null;
 ambiguous:boolean;reason:string|null;
};
export type SavedReplayStudy={
 id:string;scenario:ReplayScenario;status:"target"|"stopped"|"invalidated";
 entryPrice:number|null;exitPrice:number|null;quantity:number|null;
 riskCash:number;pnl:number|null;rMultiple:number|null;exitTime:number|null;
 ambiguous:boolean;reason:string|null;savedAt:number;
};
const positive=(v:unknown):v is number=>typeof v==="number"&&Number.isFinite(v)&&v>0;
const finiteInt=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const limits={equity:1e15,multiplier:1e12};
export function createReplayScenario(replay:ReplayState,input:ScenarioInput,id:string):ReplayScenario{
 const price=replay.snapshot[replay.cursor]?.close;
 if(!id||id.length>128||!positive(price)||!(input.side==="long"||input.side==="short"))
   throw new Error("A valid historical reference bar and direction are required.");
 if(![input.stop,input.target,input.equity,input.riskPercent,input.contractMultiplier].every(positive)
    ||input.equity>limits.equity||input.riskPercent>100||input.contractMultiplier>limits.multiplier)
   throw new Error("Enter finite positive equity, risk (up to 100%), contract value, stop and target.");
 if(input.side==="long" && !(input.stop<price&&input.target>price)||
    input.side==="short" && !(input.stop>price&&input.target<price))
   throw new Error("Place stop and target on opposite, valid sides of the last observed close.");
 if(replay.cursor>=replay.snapshot.length-1)throw new Error("No unseen candle remains for a new scenario.");
 return {...input,id,symbol:replay.symbol,frame:replay.frame,source:replay.source,
   createdCursor:replay.cursor,createdTime:Number(replay.snapshot[replay.cursor].time),referenceClose:price};
}
/** Market simulation: decision at known bar close, entry at next bar open.
 * No future bar is examined beyond replay.cursor. For ambiguous same-bar stop/target
 * touches, stop is assumed first. Open gaps fill at open rather than stop/target.
 * This is an illustrative, frictionless OHLCV model, not executable fills. */
export function evaluateReplayScenario(replay:ReplayState,plan:ReplayScenario):SimulationEvaluation{
 if(replay.symbol!==plan.symbol||replay.frame!==plan.frame||replay.source!==plan.source ||
    Number(replay.snapshot[plan.createdCursor]?.time)!==plan.createdTime)
   throw new Error("Scenario belongs to a different frozen market history.");
 const riskCash=plan.equity*plan.riskPercent/100;
 const base:SimulationEvaluation={status:"armed",entryPrice:null,exitPrice:null,
   quantity:null,riskCash,pnl:null,rMultiple:null,exitCursor:null,ambiguous:false,reason:null};
 if(replay.cursor<=plan.createdCursor)return base;
 const first=plan.createdCursor+1;
 const entry=replay.snapshot[first].open,sign=plan.side==="long"?1:-1;
 const distance=(entry-plan.stop)*sign;
 if(!(distance>0)){
   return {...base,status:"invalidated",entryPrice:entry,exitCursor:first,
     reason:"Next-bar opening gap crossed the planned stop; entry is invalidated before sizing."};
 }
 const quantity=riskCash/(distance*plan.contractMultiplier);
 if(!positive(quantity)||!Number.isFinite(quantity))return {...base,status:"invalidated",
   entryPrice:entry,exitCursor:first,reason:"Theoretical quantity is outside supported numeric limits."};
 const pnlAt=(price:number)=>quantity*(price-entry)*sign*plan.contractMultiplier;
 const result=(status:SimulationStatus,price:number,index:number,ambiguous=false,reason:string|null=null):SimulationEvaluation=>({
   status,entryPrice:entry,exitPrice:price,quantity,riskCash,pnl:pnlAt(price),
   rMultiple:(price-entry)*sign/distance,exitCursor:index,ambiguous,reason
 });
 for(let i=first;i<=replay.cursor;i++){
   const bar=replay.snapshot[i];
   const hitStop=plan.side==="long"?bar.low<=plan.stop:bar.high>=plan.stop;
   const hitTarget=plan.side==="long"?bar.high>=plan.target:bar.low<=plan.target;
   const gapStop=plan.side==="long"?bar.open<=plan.stop:bar.open>=plan.stop;
   const gapTarget=plan.side==="long"?bar.open>=plan.target:bar.open<=plan.target;
   if(gapStop)return result("stopped",bar.open,i,false,"Stopped at bar open; a gap may exceed planned risk.");
   if(gapTarget)return result("target",bar.open,i,false,"Target crossed at bar open; hypothetical favorable gap.");
   if(hitStop&&hitTarget)return result("stopped",plan.stop,i,true,"Both levels touched in one OHLC bar; conservative stop-first assumption.");
   if(hitStop)return result("stopped",plan.stop,i);
   if(hitTarget)return result("target",plan.target,i);
 }
 const current=replay.snapshot[replay.cursor];
 return {...result("open",current.close,replay.cursor),exitPrice:null,exitCursor:null};
}
export function archiveReplayStudy(replay:ReplayState,plan:ReplayScenario,result:SimulationEvaluation,now:number):SavedReplayStudy{
 if(!["stopped","target","invalidated"].includes(result.status)||!finiteInt(now))
   throw new Error("Only completed or invalidated simulations can be saved.");
 return {id:plan.id,scenario:{...plan},status:result.status as SavedReplayStudy["status"],
   entryPrice:result.entryPrice,exitPrice:result.exitPrice,quantity:result.quantity,
   riskCash:result.riskCash,pnl:result.pnl,rMultiple:result.rMultiple,
   exitTime:result.exitCursor===null?null:Number(replay.snapshot[result.exitCursor].time),
   ambiguous:result.ambiguous,reason:result.reason,savedAt:now};
}
export function parseReplayStudies(value:unknown):SavedReplayStudy[]{
 if(!Array.isArray(value))return [];
 const ids=new Set<string>(),records:SavedReplayStudy[]=[];
 for(const raw of value.slice(0,250)){
   if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
   const study=raw as SavedReplayStudy,plan=study.scenario;
   if(!plan||typeof plan!=="object"||typeof study.id!=="string"||study.id.length>128||ids.has(study.id)||
      !(study.status==="stopped"||study.status==="target"||study.status==="invalidated")||
      !(plan.symbol in symbols)||!ALL_FRAMES.includes(plan.frame)||
      !(plan.source==="demo"||plan.source==="binance")||
      typeof plan.id!=="string"||plan.id!==study.id||
      !finiteInt(plan.createdCursor)||!finiteInt(plan.createdTime)||!positive(plan.referenceClose)||
      !(plan.side==="long"||plan.side==="short")||
      ![plan.stop,plan.target,plan.equity,plan.riskPercent,plan.contractMultiplier].every(positive)||
      plan.riskPercent>100||plan.equity>limits.equity||plan.contractMultiplier>limits.multiplier||
      !positive(study.riskCash)||!finiteInt(study.savedAt)||
      (study.exitTime!==null&&!finiteInt(study.exitTime))||
      typeof study.ambiguous!=="boolean"||
      (study.reason!==null&&(typeof study.reason!=="string"||study.reason.length>200))||
      [study.entryPrice,study.exitPrice,study.quantity,study.pnl,study.rMultiple].some(v=>v!==null&&
         (typeof v!=="number"||!Number.isFinite(v))))continue;
   ids.add(study.id);records.push(study);
 }
 return records;
}
