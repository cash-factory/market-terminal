import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight, BookOpen, Check, Clock3, Compass, FilePlus2,
  History, Layers3, Search, ShieldCheck, Target, Trash2, TrendingDown,
  TrendingUp, Undo2
} from "lucide-react";
import { symbols, type SymbolId, type Frame } from "../market";
import type { PriceSource, PriceStatus } from "../data/usePriceFeed";
import {
  decisionMetrics, type DecisionDirection, type DecisionRecord,
  type DecisionSetup, type ObservationOutcome, type PlanAdherence
} from "./model";

type Props = {
  records: DecisionRecord[];
  context: {
    symbol: SymbolId;
    frame: Frame;
    source: PriceSource;
    status: PriceStatus;
    replay: boolean;
    observedClose: number | null;
    observedAtMs: number | null;
  };
  onCreate: (setup: DecisionSetup) => string | null;
  onReview: (id: string, review: {
    adherence: PlanAdherence; outcome: ObservationOutcome; note: string;
  }) => boolean;
  onDelete: (id: string) => void;
  onOpenChart: (record: DecisionRecord) => void;
};

const newSetup: DecisionSetup = {
  direction:"wait", thesis:"", trigger:"", invalidation:""
};
const utc = (timestamp: number) => new Date(timestamp).toLocaleString(
  undefined, {year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"UTC"}
) + " UTC";
const sourceLabel = (source: PriceSource) =>
  source === "demo" ? "Synthetic / demonstration" : "Binance Spot / BTCUSDT";
const directionLabel: Record<DecisionDirection,string> = {
  bullish:"Bullish scenario", bearish:"Bearish scenario", wait:"Wait / observe"
};
const outcomeLabel: Record<ObservationOutcome,string> = {
  supported:"Evidence supported", invalidated:"Premise invalidated", unresolved:"Unresolved"
};

export function DecisionDesk({records, context, onCreate, onReview, onDelete, onOpenChart}: Props) {
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const [draft,setDraft] = useState<DecisionSetup>(newSetup);
  const [search,setSearch] = useState("");
  const [showAll,setShowAll] = useState(false);
  const [adherence,setAdherence] = useState<PlanAdherence>("unassessed");
  const [outcome,setOutcome] = useState<ObservationOutcome>("unresolved");
  const [reviewNote,setReviewNote] = useState("");
  const [feedback,setFeedback] = useState("");
  const selected = records.find(record=>record.id===selectedId) ?? null;
  const stats = decisionMetrics(records);
  const visible = useMemo(()=>records.filter(record=>
    (showAll || record.symbol === context.symbol) &&
    [record.setup.thesis,record.setup.trigger,record.symbol,record.setup.direction]
      .join(" ").toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a,b)=>b.createdAtMs-a.createdAtMs),[records,showAll,context.symbol,search]);
  const canSave = Boolean(context.observedClose && context.observedAtMs &&
    draft.thesis.trim() && draft.trigger.trim() && draft.invalidation.trim());

  const saveDecision = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id=onCreate(draft);
    if (id) {
      setSelectedId(id);setDraft(newSetup);setFeedback("Original decision locked. You can append reviews without rewriting the plan.");
    }
  };
  const saveReview = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    if (onReview(selected.id,{adherence,outcome,note:reviewNote})) {
      setAdherence("unassessed");setOutcome("unresolved");setReviewNote("");
      setFeedback("Review appended to this decision's history.");
    }
  };
  const newDecision=()=>{setSelectedId(null);setFeedback("");};
  return <main className="decision-screen" aria-label="Decision Desk">
    <header className="decision-hero">
      <div className="decision-heading">
        <div className="decision-eyebrow"><span className="decision-eyebrow-mark"/> MARKET TERMINAL / RESEARCH</div>
        <h1>Decision Desk<span className="decision-title-period">.</span></h1>
        <p>Capture the rationale <em>before</em> the outcome. Revisit the evidence, review your process and preserve the original reasoning.</p>
      </div>
      <div className="decision-hero-actions">
        <span className="decision-privacy"><ShieldCheck size={14}/> Local to this browser</span>
        <button className="decision-create" type="button" onClick={newDecision}>
          <FilePlus2 size={16}/> New decision <ArrowRight size={15}/>
        </button>
      </div>
    </header>
    <div className="decision-stats" aria-label="Decision activity">
      <div><span>RECORDED</span><strong>{stats.recorded.toLocaleString()}</strong><small>Immutable initial plans</small></div>
      <div><span>REVIEWED</span><strong>{stats.reviewed.toLocaleString()}</strong><small>With at least one reflection</small></div>
      <div><span>TO REVISIT</span><strong>{stats.awaitingReview.toLocaleString()}</strong><small>Not yet reviewed</small></div>
      <div className="decision-stats-context"><span>ACTIVE CHART CONTEXT</span>
        <strong>{symbols[context.symbol].label} <small>{context.frame.toUpperCase()}</small></strong>
        <small>{sourceLabel(context.source)} · {context.replay ? "Replay" : context.status}</small>
      </div>
    </div>
    <div className="decision-workspace">
      <aside className="decision-index" aria-label="Saved decision records">
        <div className="decision-index-head"><div><span>YOUR RECORDS</span><strong>Observation library</strong></div>
          <span className="decision-index-count">{visible.length}</span>
        </div>
        <div className="decision-filter-tools">
          <label className="decision-search"><Search size={15}/><input type="search"
            aria-label="Filter decisions" value={search} onChange={event=>setSearch(event.target.value)}
            placeholder="Find a thesis or instrument…"/></label>
          <div className="decision-scope" role="group" aria-label="Decision instrument filter">
            <button type="button" className={!showAll?"chosen":""} aria-pressed={!showAll}
              onClick={()=>setShowAll(false)}>Current instrument</button>
            <button type="button" className={showAll?"chosen":""} aria-pressed={showAll}
              onClick={()=>setShowAll(true)}>All instruments</button>
          </div>
        </div>
        <div className="decision-index-list">
          <button type="button" className={"decision-index-item decision-new-entry"+(!selected?" chosen":"")}
            onClick={newDecision}><span className="decision-new-icon"><FilePlus2 size={17}/></span>
            <span><strong>Start a new decision</strong><small>Capture the current chart context</small></span>
            <ArrowRight size={15}/></button>
          {visible.map(record=>{
            const lastReview=record.reviews.at(-1);
            return <button key={record.id} type="button"
              className={"decision-index-item"+(selectedId===record.id?" chosen":"")}
              aria-pressed={selectedId===record.id} onClick={()=>{setSelectedId(record.id);setFeedback("");}}>
              <span className={"decision-direction-icon "+record.setup.direction}>
                {record.setup.direction==="bullish"?<TrendingUp size={17}/>:
                  record.setup.direction==="bearish"?<TrendingDown size={17}/>:<Compass size={17}/>}</span>
              <span className="decision-index-main"><span className="decision-index-meta">
                {symbols[record.symbol].label} <i>·</i> {record.frame.toUpperCase()}
              </span><strong>{record.setup.thesis}</strong><small>
                {utc(record.createdAtMs)} · {lastReview?"Reviewed":"Open"}
              </small></span>
            </button>;
          })}
          {!visible.length&&<div className="decision-empty-list">
            <BookOpen size={22}/><strong>No matching records</strong>
            <span>{search?"Try another search.":"Your recorded decisions will appear here when you save them."}</span>
          </div>}
        </div>
        <div className="decision-index-foot"><Layers3 size={15}/> Backed up with your workspace JSON export</div>
      </aside>
      <section className="decision-detail" aria-label={selected?"Decision record":"New decision form"}>
        {selected ? <>
          <div className="decision-detail-top">
            <div><span className="decision-overline">DECISION RECORD · ORIGINAL IS READ-ONLY</span>
              <h2>{symbols[selected.symbol].label} <span>/</span> {selected.frame.toUpperCase()}</h2>
              <p>{directionLabel[selected.setup.direction]} · Captured {utc(selected.createdAtMs)}</p></div>
            <button type="button" className="decision-quiet-action" onClick={()=>onOpenChart(selected)}>
              Open current chart <ArrowRight size={15}/>
            </button>
          </div>
          <div className="decision-source-strip">
            <div><span>OBSERVED CANDLE</span><strong>{utc(selected.snapshot.barTimeMs)}</strong></div>
            <div><span>PRICE SOURCE</span><strong>{sourceLabel(selected.source)}</strong></div>
            <div><span>AT CAPTURE</span><strong>{selected.replay?"Replay":selected.feedStatus}</strong></div>
          </div>
          <div className="decision-snapshot"><span className="decision-subheading">FROZEN PRICE OBSERVATION</span>
            <div className="decision-ohlc">{([
              ["OPEN",selected.snapshot.open],["HIGH",selected.snapshot.high],
              ["LOW",selected.snapshot.low],["CLOSE",selected.snapshot.close]
            ] as const).map(([key,value])=><div key={key}><small>{key}</small><strong>{value.toLocaleString(undefined,{
              maximumFractionDigits:symbols[selected.symbol].precision,
              minimumFractionDigits:symbols[selected.symbol].precision
            })}</strong></div>)}</div>
            <small>{selected.snapshot.barsVisible} candles visible when recorded. This snapshot does not update with the market and is not an executable quote.</small>
          </div>
          <div className="decision-original">
            <h3><ShieldCheck size={16}/> Original reasoning</h3>
            <div className="decision-original-grid">
              <div><span>01 / THESIS</span><p>{selected.setup.thesis}</p></div>
              <div><span>02 / WHAT WOULD CONFIRM IT</span><p>{selected.setup.trigger}</p></div>
              <div><span>03 / WHAT WOULD INVALIDATE IT</span><p>{selected.setup.invalidation}</p></div>
            </div>
          </div>
          <section className="decision-review">
            <div className="decision-review-head"><div><span className="decision-overline">REVIEW THE PROCESS, NOT JUST THE OUTCOME</span>
              <h3>Reflection history <small>{selected.reviews.length}</small></h3></div><History size={19}/></div>
            {selected.reviews.map((entry,index)=><article key={entry.id} className="decision-review-entry">
              <div><span className="decision-review-number">{String(index+1).padStart(2,"0")}</span>
                <strong>{outcomeLabel[entry.outcome]}</strong><time dateTime={new Date(entry.createdAtMs).toISOString()}>{utc(entry.createdAtMs)}</time></div>
              <small>Plan: {entry.adherence==="followed"?"Followed":entry.adherence==="changed"?"Changed":"Not assessed"}</small>
              {entry.note&&<p>{entry.note}</p>}
            </article>)}
            {!selected.reviews.length&&<p className="decision-review-empty">No review yet. Record what actually unfolded when you have enough information. Avoid judging a decision only by profit or loss.</p>}
            <form className="decision-review-form" onSubmit={saveReview}>
              <div className="decision-review-fields">
                <label>Did you follow your original plan?
                  <select aria-label="Plan adherence" value={adherence}
                    onChange={e=>setAdherence(e.target.value as PlanAdherence)}>
                    <option value="unassessed">Not assessed</option>
                    <option value="followed">Followed the plan</option>
                    <option value="changed">Changed the plan</option>
                  </select></label>
                <label>What did the market evidence show?
                  <select aria-label="Market outcome" value={outcome}
                    onChange={e=>setOutcome(e.target.value as ObservationOutcome)}>
                    <option value="unresolved">Not yet clear</option>
                    <option value="supported">Supported the thesis</option>
                    <option value="invalidated">Invalidated the thesis</option>
                  </select></label>
              </div>
              <label>What did you learn or observe?
                <textarea aria-label="Review notes" rows={3} maxLength={1000} value={reviewNote}
                  onChange={e=>setReviewNote(e.target.value)}
                  placeholder="Record evidence, decisions, uncertainty or what you would do differently…"/></label>
              <div className="decision-form-foot"><small>Reviews append; nothing overwrites the original.</small>
                <button className="decision-create" type="submit"><Check size={15}/> Append review</button></div>
            </form>
          </section>
          <div className="decision-danger-zone"><button type="button" onClick={()=>{
            if(window.confirm("Permanently delete this local decision and its review history?")){
              onDelete(selected.id);setSelectedId(null);setFeedback("");
            }
          }}><Trash2 size={15}/> Delete record</button></div>
        </> : <>
          <div className="decision-detail-top">
            <div><span className="decision-overline">01 / CAPTURE THE REASONING</span>
              <h2>Build a decision record<span className="decision-title-period">.</span></h2>
              <p>A compact precommitment tied to the market data visible at capture.</p></div>
            <span className="decision-draft-label"><Clock3 size={14}/> Uncommitted draft</span>
          </div>
          <div className="decision-live-context"><div className="decision-live-icon"><Target size={22}/></div>
            <div><span>OBSERVATION CONTEXT</span><strong>{symbols[context.symbol].label} / {context.frame.toUpperCase()}</strong>
              <small>{sourceLabel(context.source)} · {context.replay?"Historical replay":context.status}</small></div>
            <div className="decision-live-price"><span>VISIBLE CLOSE</span>
              <strong>{context.observedClose ? context.observedClose.toLocaleString(undefined,{
                maximumFractionDigits:symbols[context.symbol].precision,
                minimumFractionDigits:symbols[context.symbol].precision
              }):"—"}</strong>
              {context.observedAtMs&&<small>{utc(context.observedAtMs)}</small>}</div>
          </div>
          {(context.status==="stale"||context.status==="error")&&!context.replay&&
            <div className="decision-data-warning" role="status">The exchange feed is {context.status}. You may capture your reasoning, but this observation is not a current quote.</div>}
          <form className="decision-capture-form" onSubmit={saveDecision}>
            <fieldset className="decision-bias"><legend>YOUR CURRENT SCENARIO</legend>
              {([
                ["bullish","Bullish",TrendingUp],["bearish","Bearish",TrendingDown],["wait","Observe",Compass]
              ] as const).map(([direction,label,Icon])=><button key={direction}
                type="button" aria-pressed={draft.direction===direction}
                className={draft.direction===direction?"chosen":""}
                onClick={()=>setDraft(value=>({...value,direction}))}><Icon size={17}/>{label}</button>)}
            </fieldset>
            <label className="decision-field"><span><b>01</b> The thesis</span>
              <small>What do you currently believe the market might do?</small>
              <textarea aria-label="Decision thesis" required rows={3} maxLength={500}
                value={draft.thesis} onChange={e=>setDraft(value=>({...value,thesis:e.target.value}))}
                placeholder="My working scenario is…"/></label>
            <div className="decision-form-pair">
              <label className="decision-field"><span><b>02</b> Confirmation</span>
                <small>What observable evidence would strengthen it?</small>
                <textarea aria-label="Decision confirmation" required rows={3} maxLength={300}
                  value={draft.trigger} onChange={e=>setDraft(value=>({...value,trigger:e.target.value}))}
                  placeholder="I would need to see…"/></label>
              <label className="decision-field"><span><b>03</b> Invalidation</span>
                <small>What observation would change your view?</small>
                <textarea aria-label="Decision invalidation" required rows={3} maxLength={300}
                  value={draft.invalidation} onChange={e=>setDraft(value=>({...value,invalidation:e.target.value}))}
                  placeholder="My view is wrong if…"/></label>
            </div>
            <div className="decision-commit-card"><ShieldCheck size={18}/><div><strong>Snapshot integrity</strong>
              <p>Saving freezes the latest candle visible in this chart context. A replay snapshot never reaches forward into unseen candles. Later reflections are appended, not silently edited.</p></div></div>
            <div className="decision-form-foot"><small>Research notes only · No trade execution or financial advice</small>
              <button type="submit" className="decision-create" disabled={!canSave}><Check size={16}/> Lock the observation <ArrowRight size={15}/></button></div>
          </form>
        </>}
        {feedback&&<div className="decision-local-feedback" role="status"><Check size={15}/>{feedback}</div>}
      </section>
    </div>
    <footer className="decision-desk-footer"><Undo2 size={14}/> Decisions measure the quality of your process separately from financial outcomes. They do not predict the market or imply a trading edge.</footer>
  </main>;
}
