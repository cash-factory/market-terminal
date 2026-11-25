import {useEffect,useState} from "react";
import {PeakIcon} from "./PeakIcon";

const centers=[
  {label:"London",zone:"Europe/London"},
  {label:"New York",zone:"America/New_York"},
  {label:"Tokyo",zone:"Asia/Tokyo"},
  {label:"Sydney",zone:"Australia/Sydney"},
] as const;

function clock(time:number,zone:string):string{
  try {return new Intl.DateTimeFormat(undefined,{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(time)}
  catch {return "—"}
}
/** Geographic session reference only. Never asserts that an exchange is open or that prices are live. */
export function PeakSessionPanel(){
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    const timer=window.setInterval(()=>setNow(Date.now()),60_000);
    return ()=>window.clearInterval(timer);
  },[]);
  return <section className="peak-session-panel" aria-label="Market centre clocks">
    <div className="peak-panel-title"><PeakIcon name="session-globe" size={17}/><strong>Session map</strong><span>Reference</span></div>
    <div className="peak-session-visual" aria-hidden="true">
      <img className="peak-session-map" loading="lazy" src={import.meta.env.BASE_URL+"assets/reference/media/session-map-dots.svg"} alt=""/>
      <span className="peak-map-label peak-map-newyork">New York</span>
      <span className="peak-map-label peak-map-london">London</span>
      <span className="peak-map-label peak-map-tokyo">Tokyo</span>
      <span className="peak-map-label peak-map-sydney">Sydney</span>
    </div>
    <div className="peak-session-clocks">
      {centers.map(c=><div key={c.zone}><span>{c.label}</span><time>{clock(now,c.zone)}</time></div>)}
    </div>
    <p>Local city times only. Trading hours, holidays and data-feed availability vary by market and provider.</p>
  </section>;
}
