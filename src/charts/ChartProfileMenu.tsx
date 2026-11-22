import { useState } from "react";
import { Bookmark, Check, ChevronDown, Trash2, X } from "lucide-react";
import type { ChartProfile } from "./profiles";
import { profileSubtitle } from "./profiles";

type Props={
  profiles:readonly ChartProfile[];
  onSave:(name:string)=>void;
  onApply:(id:string)=>void;
  onDelete:(id:string)=>void;
};
export function ChartProfileMenu({profiles,onSave,onApply,onDelete}:Props){
  const [open,setOpen]=useState(false);
  const [name,setName]=useState("");
  const save=()=>{
    if(!name.trim())return;
    onSave(name);
    setName("");
  };
  return <div className="chart-profile-picker">
    <button className={"compact-action "+(open?"active":"")} aria-expanded={open}
      aria-label="Chart workspace profiles" onClick={()=>setOpen(v=>!v)}>
      <Bookmark size={15}/> Layouts <ChevronDown size={13}/>
    </button>
    {open&&<section className="chart-profile-popover" aria-label="Chart workspace profiles manager">
      <div className="chart-profile-heading">
        <div><strong>Saved chart workspaces</strong>
          <small>Save every pane, symbol, source, timeframe and study setup.</small></div>
        <button aria-label="Close chart profiles" onClick={()=>setOpen(false)}><X size={16}/></button>
      </div>
      <div className="chart-profile-save">
        <input aria-label="Chart profile name" value={name} maxLength={80}
          placeholder="Name current chart setup" onChange={e=>setName(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")save();}}/>
        <button aria-label="Save chart profile" disabled={!name.trim()} onClick={save}>
          <Bookmark size={15}/> Save
        </button>
      </div>
      <div className="chart-profile-list">
        {profiles.length===0?<p>No saved layouts yet. Save your current chart configuration to return to it instantly.</p>:
          [...profiles].reverse().map(profile=><div className="chart-profile-item" key={profile.id}>
            <div><strong>{profile.name}</strong><small>{profileSubtitle(profile)}</small></div>
            <button aria-label={"Apply chart profile "+profile.name}
              onClick={()=>{onApply(profile.id);setOpen(false);}}>
              <Check size={14}/> Apply</button>
            <button className="chart-profile-delete" aria-label={"Delete chart profile "+profile.name}
              onClick={()=>onDelete(profile.id)}><Trash2 size={15}/></button>
          </div>)}
      </div>
      <p className="chart-profile-note">Only chart settings are restored. Existing drawings, alerts and account-independent tools are kept.</p>
    </section>}
  </div>;
}
