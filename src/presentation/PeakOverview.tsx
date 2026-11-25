import {ArrowRight,ChartCandlestick,Film} from "lucide-react";
import {PeakIcon} from "./PeakIcon";
type Props={
  instrument:string;
  drawings:number;
  alerts:number;
  studies:number;
  watchlist:number;
  source:string;
  onResume:()=>void;
  onReplay:()=>void;
  onDrawings:()=>void;
  onAlerts:()=>void;
  onLibrary:()=>void;
};
export function PeakOverview({instrument,drawings,alerts,studies,watchlist,source,onResume,onReplay,onDrawings,onAlerts,onLibrary}:Props){
  const actions=[
    {key:"drawings",icon:"drawing-sets",label:"Drawing tools",detail:`${drawings} saved objects`,onClick:onDrawings},
    {key:"replay",icon:"workspace-replay",label:"Historical replay",detail:"Reversible candle study",onClick:onReplay},
    {key:"studies",icon:"workspace-stack",label:"Study archive",detail:`${studies} saved studies`,onClick:onLibrary},
    {key:"alerts",icon:"ui-alert",label:"Price alerts",detail:`${alerts} configured`,onClick:onAlerts},
  ];
  return <>
    <section className="peak-home-hero" aria-label="Market Terminal workspace overview">
      <div className="peak-hero-content">
        <div className="peak-overline"><span className="peak-live-rule"/> CHART WORKSPACE</div>
        <h1>Resume your<br/><em>{instrument} analysis.</em></h1>
        <p>Open your chart with its saved drawings, or step through historical candles in replay.</p>
        <div className="peak-hero-actions">
          <button className="peak-hero-primary" onClick={onResume}><ChartCandlestick size={17}/> Resume {instrument} <ArrowRight size={16}/></button>
          <button className="peak-hero-secondary" onClick={onReplay}><Film size={16}/> Open replay</button>
        </div>
        <div className="peak-hero-status"><span className="peak-status-point"/><span>Data source: {source}</span><span className="peak-status-sep"/> Local-first workspace</div>
      </div>
      <img className="peak-hero-ribbon" src={import.meta.env.BASE_URL+"assets/reference/media/red-signal-ribbon.svg"} alt="" loading="lazy"/>
      <div className="peak-hero-watermark" aria-hidden="true">MT / PEAK</div>
    </section>
    <section className="peak-home-metrics" aria-label="Your saved workspace summary">
      <div><PeakIcon name="favorites-star"/><span>Watchlist instruments</span><strong>{watchlist}</strong></div>
      <div><PeakIcon name="chart-trendline"/><span>Drawing objects</span><strong>{drawings}</strong></div>
      <div><PeakIcon name="workspace-replay"/><span>Archived replay studies</span><strong>{studies}</strong></div>
      <div><PeakIcon name="ui-alert"/><span>Configured alerts</span><strong>{alerts}</strong></div>
    </section>
    <section className="peak-home-quick">
      <div className="peak-section-kicker">START WHERE YOU LEFT OFF</div>
      <div className="peak-section-heading"><h2>Research workspace</h2><span>Everything here stays in your browser unless exported</span></div>
      <div className="peak-home-actions">
        {actions.map(({key,icon,label,detail,onClick})=><button key={key} type="button" onClick={onClick}>
          <span className="peak-action-glyph"><PeakIcon name={icon} size={20}/></span><strong>{label}</strong><small>{detail}</small><ArrowRight className="peak-action-arrow" size={16}/>
        </button>)}
      </div>
    </section>
    <section className="peak-home-source-note"><PeakIcon name="ui-panel-glass" size={18}/><p>Crypto charts identify their exchange feed and connection status. Markets without a configured provider show no prices. Replay results are hypothetical.</p></section>
  </>;
}
