import { Film, Pause, Play, SkipForward, X } from "lucide-react";
import type { ReplaySpeed,ReplayState } from "./model";

type Props={
  replay:ReplayState;
  onTogglePlay:()=>void;
  onStep:()=>void;
  onSeek:(cursor:number)=>void;
  onSpeed:(speed:ReplaySpeed)=>void;
  onExit:()=>void;
};
export function ReplayControls({replay,onTogglePlay,onStep,onSeek,onSpeed,onExit}:Props){
  const current=replay.snapshot[replay.cursor];
  const finished=replay.cursor>=replay.snapshot.length-1;
  return <section className="replay-controls" aria-label="Historical candle replay">
    <div className="replay-title"><div className="replay-icon"><Film size={18}/></div>
      <div><strong>Historical replay</strong><small>Frozen snapshot · No future candles shown</small></div>
    </div>
    <div className="replay-actions">
      <button className="replay-play" aria-label={replay.playing?"Pause replay":"Play replay"}
        onClick={onTogglePlay} disabled={finished}>
        {replay.playing?<Pause size={17}/>:<Play size={17}/>}
        <span>{replay.playing?"Pause":"Play"}</span>
      </button>
      <button className="replay-step" aria-label="Step forward" title="Next historical candle"
        onClick={onStep} disabled={finished}><SkipForward size={17}/></button>
      <label className="replay-speed">Speed
        <select value={replay.speed} aria-label="Replay playback speed"
          onChange={event=>onSpeed(Number(event.target.value) as ReplaySpeed)}>
          <option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
        </select>
      </label>
    </div>
    <div className="replay-timeline">
      <input type="range" aria-label="Replay position" min={0} max={replay.snapshot.length-1}
        value={replay.cursor} onChange={event=>onSeek(Number(event.target.value))}/>
      <div><span>Bar {replay.cursor+1} / {replay.snapshot.length}</span>
        <span>{typeof current.time==="number"?new Date(Number(current.time)*1000).toLocaleString():"Historical snapshot"}</span></div>
    </div>
    <button className="replay-exit" aria-label="Exit replay" title="Exit historical replay"
      onClick={onExit}><X size={18}/><span>Exit</span></button>
  </section>;
}
