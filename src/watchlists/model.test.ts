import {describe,expect,it} from "vitest";
import {activeWatchlist,addSymbol,containsSymbol,createSection,createWatchlist,
  defaultWatchlists,deleteSection,deleteWatchlist,duplicateWatchlist,moveSymbol,
  parseWatchlists,removeSymbol,renameWatchlist,reorderSymbol,setSymbolNote,
  toggleStar} from "./model";

describe("independent local watchlists",()=>{
  it("restores validated lists with duplicate and unsupported symbols removed",()=>{
    const state=parseWatchlists({activeId:"unknown",lists:[{id:"custom",name:"Investments",
      sections:[{id:"one",name:"Equities",entries:[
        {symbol:"AAPL",note:"Thesis",starred:true},{symbol:"AAPL"},
        {symbol:"UNLICENSED"},{symbol:"EURUSD",note:"FX"}
      ]},{id:"two",name:"Other",entries:[{symbol:"AAPL"},{symbol:"US100"}]}]}]});
    expect(state.activeId).toBe("custom");
    expect(state.lists[0].sections.flatMap(s=>s.entries).map(e=>e.symbol)).toEqual(["AAPL","EURUSD","US100"]);
    expect(state.lists[0].sections[0].entries[0].note).toBe("Thesis");
    expect(parseWatchlists({lists:[]})).toEqual(defaultWatchlists);
  });
  it("creates, duplicates and renames lists without modifying another list",()=>{
    const s=createWatchlist(defaultWatchlists,"Focus");
    const next=addSymbol(s,"AAPL");
    expect(activeWatchlist(next).sections[0].entries).toHaveLength(1);
    const duplicate=duplicateWatchlist(next);
    expect(activeWatchlist(duplicate).sections[0].entries[0].symbol).toBe("AAPL");
    expect(renameWatchlist(duplicate,"My Screens").lists.at(-1)!.name).toBe("My Screens");
    expect(deleteWatchlist(duplicate).lists).toHaveLength(2);
    expect(defaultWatchlists.lists[0].sections[0].entries).toHaveLength(4);
  });
  it("moves, reorders, annotates and stars symbols with no loss",()=>{
    const s=createWatchlist(defaultWatchlists,"Review");
    const a=addSymbol(addSymbol(s,"BTCUSDT"),"AAPL");
    expect(addSymbol(a,"BTCUSDT")).toBe(a);
    const b=createSection(a,"Crypto");
    const cryptoId=activeWatchlist(b).sections[1].id;
    const moved=moveSymbol(b,"BTCUSDT",cryptoId);
    expect(activeWatchlist(moved).sections[1].entries.map(e=>e.symbol)).toEqual(["BTCUSDT"]);
    expect(reorderSymbol(moved,"BTCUSDT",1)).toEqual(moved);
    const annotated=setSymbolNote(toggleStar(moved,"BTCUSDT"),"BTCUSDT","Entry near invalidation");
    expect(activeWatchlist(annotated).sections[1].entries[0]).toMatchObject({
      starred:true,note:"Entry near invalidation"
    });
    const removed=deleteSection(annotated,cryptoId);
    expect(containsSymbol(activeWatchlist(removed),"BTCUSDT")).toBe(true);
    expect(removeSymbol(removed,"BTCUSDT").lists.at(-1)!.sections[0].entries).toHaveLength(1);
    expect(reorderSymbol(a,"AAPL",-1).lists.at(-1)!.sections[0].entries[0].symbol).toBe("AAPL");
  });
  it("cannot delete the only list and preserves empty section structure",()=>{
    expect(deleteWatchlist(defaultWatchlists)).toBe(defaultWatchlists);
    const first=createWatchlist(defaultWatchlists,"Empty");
    expect(parseWatchlists(JSON.parse(JSON.stringify(first)))).toEqual(first);
  });
});
