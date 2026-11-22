import type { CandlestickData,UTCTimestamp } from "lightweight-charts";
import type { SymbolId, Frame } from "../market";
import type { PriceSource } from "../data/usePriceFeed";

/** Replay is a frozen local history snapshot. It never requests future candles. */
export type ReplaySpeed=1|2|4;
export type ReplayState={
  symbol:SymbolId;
  frame:Frame;
  source:PriceSource;
  snapshot:CandlestickData<UTCTimestamp>[];
  cursor:number;
  playing:boolean;
  speed:ReplaySpeed;
};
export function beginReplay(
  history:readonly CandlestickData<UTCTimestamp>[],
  symbol:SymbolId,frame:Frame,source:PriceSource
):ReplayState{
  if(history.length<40)throw new Error("Replay needs at least 40 historical candles.");
  return {
    symbol,frame,source,
    snapshot:history.map(bar=>({...bar})),
    cursor:Math.max(19,Math.floor(history.length/2)-1),
    playing:false,speed:1
  };
}
export function visibleReplayCandles(state:ReplayState):CandlestickData<UTCTimestamp>[]{
  return state.snapshot.slice(0,Math.min(state.snapshot.length,state.cursor+1));
}
export function stepReplay(state:ReplayState,by=1):ReplayState{
  const next=Math.max(0,Math.min(state.snapshot.length-1,Math.round(state.cursor+by)));
  return {...state,cursor:next,playing:next>=state.snapshot.length-1?false:state.playing};
}
export function seekReplay(state:ReplayState,cursor:number):ReplayState{
  const finite=Number.isFinite(cursor)?Math.round(cursor):state.cursor;
  return {...stepReplay(state,finite-state.cursor),playing:false};
}
export function setReplaySpeed(state:ReplayState,speed:ReplaySpeed):ReplayState{
  return {...state,speed};
}
export function toggleReplayPlayback(state:ReplayState):ReplayState{
  return {...state,playing:state.cursor<state.snapshot.length-1?!state.playing:false};
}
