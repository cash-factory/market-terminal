import {symbols, type SymbolId} from "../market";

export type WatchlistEntry = {symbol:SymbolId; note:string; starred:boolean};
export type WatchlistSection = {id:string; name:string; entries:WatchlistEntry[]};
export type Watchlist = {id:string; name:string; sections:WatchlistSection[]};
export type WatchlistsState = {activeId:string; lists:Watchlist[]};

export const defaultWatchlists:WatchlistsState={
  activeId:"markets",
  lists:[{
    id:"markets",name:"Markets",
    sections:[{id:"main",name:"Main",entries:[
      {symbol:"EURUSD",note:"",starred:false},
      {symbol:"BTCUSDT",note:"",starred:true},
      {symbol:"AAPL",note:"",starred:false},
      {symbol:"US100",note:"",starred:false}
    ]}]
  }]
};
const known=(value:unknown):value is SymbolId=>typeof value==="string"&&
  Object.prototype.hasOwnProperty.call(symbols,value);
const record=(value:unknown):value is Record<string,unknown>=>!!value&&
  typeof value==="object"&&!Array.isArray(value);
const label=(value:unknown,fallback:string,max=80)=>typeof value==="string"&&value.trim()?
  value.trim().slice(0,max):fallback;
const uuid=()=>crypto.randomUUID();
export const activeWatchlist=(state:WatchlistsState):Watchlist=>
  state.lists.find(list=>list.id===state.activeId)??state.lists[0]??defaultWatchlists.lists[0];
const withList=(state:WatchlistsState,change:(list:Watchlist)=>Watchlist):WatchlistsState=>
  ({...state,lists:state.lists.map(list=>list.id===activeWatchlist(state).id?change(list):list)});
export const containsSymbol=(list:Watchlist,symbol:SymbolId)=>
  list.sections.some(section=>section.entries.some(entry=>entry.symbol===symbol));

export function parseWatchlists(value:unknown):WatchlistsState{
  if(!record(value)||!Array.isArray(value.lists))return structuredClone(defaultWatchlists);
  const ids=new Set<string>();
  const lists:Watchlist[]=value.lists.flatMap((raw,i)=>{
    if(!record(raw))return [];
    let id=label(raw.id,"list-"+i,100);
    if(ids.has(id))id="list-"+i+"-"+ids.size;
    ids.add(id);
    const seen=new Set<SymbolId>();
    const sectionIds=new Set<string>();
    const sections:WatchlistSection[]=(Array.isArray(raw.sections)?raw.sections:[]).flatMap((part,j)=>{
      if(!record(part))return [];
      let sid=label(part.id,"section-"+j,100);
      if(sectionIds.has(sid))sid="section-"+j+"-"+sectionIds.size;
      sectionIds.add(sid);
      const entries:WatchlistEntry[]=(Array.isArray(part.entries)?part.entries:[]).flatMap(item=>{
        if(!record(item)||!known(item.symbol)||seen.has(item.symbol))return [];
        seen.add(item.symbol);
        return [{symbol:item.symbol,note:label(item.note,"",600),
          starred:item.starred===true}];
      });
      return [{id:sid,name:label(part.name,"Section "+(j+1)),entries}];
    });
    return [{id,name:label(raw.name,"Untitled list"),sections:sections.length?sections:
      [{id:"main",name:"Main",entries:[]}]}];
  });
  if(!lists.length)return structuredClone(defaultWatchlists);
  const activeId=typeof value.activeId==="string"&&lists.some(list=>list.id===value.activeId)?
    value.activeId:lists[0].id;
  return {activeId,lists};
}
export function createWatchlist(state:WatchlistsState,name:string):WatchlistsState{
  const id=uuid();
  return {activeId:id,lists:[...state.lists,{id,name:label(name,"New watchlist"),
    sections:[{id:uuid(),name:"Main",entries:[]}]}]};
}
export function duplicateWatchlist(state:WatchlistsState):WatchlistsState{
  const original=activeWatchlist(state),id=uuid();
  return {activeId:id,lists:[...state.lists,{
    id,name:original.name+" copy",sections:original.sections.map(section=>({
      id:uuid(),name:section.name,entries:section.entries.map(entry=>({...entry}))
    }))
  }]};
}
export const selectWatchlist=(state:WatchlistsState,id:string):WatchlistsState=>
  state.lists.some(list=>list.id===id)?{...state,activeId:id}:state;
export const renameWatchlist=(state:WatchlistsState,name:string):WatchlistsState=>
  withList(state,list=>({...list,name:label(name,list.name)}));
export function deleteWatchlist(state:WatchlistsState):WatchlistsState{
  if(state.lists.length<=1)return state;
  const lists=state.lists.filter(list=>list.id!==activeWatchlist(state).id);
  return {activeId:lists[0].id,lists};
}
export function addSymbol(state:WatchlistsState,symbol:SymbolId,sectionId?:string):WatchlistsState{
  if(!known(symbol)||containsSymbol(activeWatchlist(state),symbol))return state;
  return withList(state,list=>{
    const target=sectionId&&list.sections.some(section=>section.id===sectionId)?sectionId:list.sections[0].id;
    return {...list,sections:list.sections.map(section=>section.id===target?{...section,
      entries:[...section.entries,{symbol,note:"",starred:false}]}:section)};
  });
}
export function removeSymbol(state:WatchlistsState,symbol:SymbolId):WatchlistsState{
  if(!containsSymbol(activeWatchlist(state),symbol))return state;
  return withList(state,list=>({...list,sections:list.sections.map(section=>({...section,
    entries:section.entries.filter(entry=>entry.symbol!==symbol)}))}));
}
export function setSymbolNote(state:WatchlistsState,symbol:SymbolId,note:string):WatchlistsState{
  return withList(state,list=>({...list,sections:list.sections.map(section=>({...section,
    entries:section.entries.map(entry=>entry.symbol===symbol?{...entry,note:note.slice(0,600)}:entry)
  }))}));
}
export function toggleStar(state:WatchlistsState,symbol:SymbolId):WatchlistsState{
  return withList(state,list=>({...list,sections:list.sections.map(section=>({...section,
    entries:section.entries.map(entry=>entry.symbol===symbol?{...entry,starred:!entry.starred}:entry)
  }))}));
}
export function reorderSymbol(state:WatchlistsState,symbol:SymbolId,direction:-1|1):WatchlistsState{
  return withList(state,list=>({...list,sections:list.sections.map(section=>{
    const index=section.entries.findIndex(entry=>entry.symbol===symbol);
    const to=index+direction;
    if(index<0||to<0||to>=section.entries.length)return section;
    const entries=[...section.entries];
    [entries[index],entries[to]]=[entries[to],entries[index]];
    return {...section,entries};
  })}));
}
export function createSection(state:WatchlistsState,name:string):WatchlistsState{
  return withList(state,list=>({...list,sections:[...list.sections,
    {id:uuid(),name:label(name,"New section"),entries:[]}]}));
}
export function renameSection(state:WatchlistsState,id:string,name:string):WatchlistsState{
  return withList(state,list=>({...list,sections:list.sections.map(section=>
    section.id===id?{...section,name:label(name,section.name)}:section)}));
}
export function deleteSection(state:WatchlistsState,id:string):WatchlistsState{
  return withList(state,list=>{
    if(list.sections.length<=1)return list;
    const removed=list.sections.find(section=>section.id===id);
    if(!removed)return list;
    const target=list.sections.find(section=>section.id!==id)!;
    return {...list,sections:list.sections.filter(section=>section.id!==id)
      .map(section=>section.id===target.id?{...section,
        entries:[...section.entries,...removed.entries]}:section)};
  });
}
export function moveSymbol(state:WatchlistsState,symbol:SymbolId,targetSectionId:string):WatchlistsState{
  const list=activeWatchlist(state);
  if(!list.sections.some(section=>section.id===targetSectionId))return state;
  const origin=list.sections.find(section=>section.entries.some(entry=>entry.symbol===symbol));
  if(!origin||origin.id===targetSectionId)return state;
  const entry=origin.entries.find(item=>item.symbol===symbol)!;
  return withList(state,list=>({...list,sections:list.sections.map(section=>{
    if(section.id===origin.id)return {...section,entries:section.entries.filter(item=>item.symbol!==symbol)};
    if(section.id===targetSectionId)return {...section,entries:[...section.entries,entry]};
    return section;
  })}));
}
