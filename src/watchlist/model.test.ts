import {describe,expect,it} from "vitest";
import {parseWatchlist,parseWatchlistFavorites,orderedWatchlist,addWatchlistInstrument,moveWatchlistInstrument} from "./model";
describe("analyst watchlists",()=>{
 it("migrates missing state and rejects unknown or duplicate instruments",()=>{
  expect(parseWatchlist(undefined)).toEqual(["EURUSD","BTCUSDT","AAPL","US100"]);
  expect(parseWatchlist([])).toEqual([]);
  expect(parseWatchlist(["AAPL","INVALID","AAPL","EURUSD",null])).toEqual(["AAPL","EURUSD"]);
  expect(parseWatchlistFavorites(["EURUSD","FAKE","EURUSD","AAPL"],["EURUSD"])).toEqual(["EURUSD"]);
 });
 it("pins favorites first, preserves order and limits swaps to a pin group",()=>{
  const items=parseWatchlist(["AAPL","EURUSD","US100","BTCUSDT"]);
  const pinned=parseWatchlistFavorites(["US100","EURUSD"],items);
  expect(orderedWatchlist(items,pinned)).toEqual(["EURUSD","US100","AAPL","BTCUSDT"]);
  expect(moveWatchlistInstrument(items,pinned,"US100",-1)).toEqual(["US100","EURUSD","AAPL","BTCUSDT"]);
  expect(moveWatchlistInstrument(items,pinned,"US100",1)).toEqual(items);
  expect(addWatchlistInstrument(items,"EURUSD")).toEqual(items);
  expect(addWatchlistInstrument(["AAPL"],"BTCUSDT")).toEqual(["AAPL","BTCUSDT"]);
 });
});
