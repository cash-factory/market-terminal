import type {SymbolId} from "../market";
import type {PriceSource} from "./usePriceFeed";

/** Calendar annotations are reference information, not a quote-status flag.
 * A real feed's historical/live/stale status always comes from its provider.
 *
 * AAPL is Nasdaq-listed. The snapshot below is based on Nasdaq's published
 * 2026 U.S. holiday and early close calendar (verified 2026-11-22):
 * https://www.nasdaq.com/holiday-trading-hours
 * Nasdaq can issue additional Trader Alerts/halts; only official updates from
 * the appropriate provider can confirm actual venue execution eligibility.
 */
export type MarketHoursReference={
  venue:string;
  zone:string;
  calendarStatus:"regular"|"closed"|"early-close"|"unknown"|"continuous-reference";
  summary:string;
  detail:string;
  sourceUrl:string|null;
  isExecutionAvailabilityConfirmed:false;
};
const NASDAQ_2026_HOLIDAYS = new Set([
  "2026-01-01","2026-01-19","2026-02-16","2026-04-03",
  "2026-05-25","2026-06-19","2026-07-03","2026-09-07",
  "2026-11-26","2026-12-25"
]);
const NASDAQ_2026_EARLY_CLOSE=new Set(["2026-11-27","2026-12-24"]);
const NASDAQ_REF="https://www.nasdaq.com/holiday-trading-hours";
const easternParts=new Intl.DateTimeFormat("en-US",{
  timeZone:"America/New_York",year:"numeric",month:"2-digit",
  day:"2-digit",weekday:"short",hour:"2-digit",minute:"2-digit",
  hourCycle:"h23"
});
export function easternWallClock(atMs:number):{
  date:string;weekday:string;minuteOfDay:number;year:number
}|null{
  if(!Number.isFinite(atMs)||Math.abs(atMs)>8.64e15)return null;
  const parts=Object.fromEntries(easternParts.formatToParts(new Date(atMs))
    .filter(part=>part.type!=="literal").map(part=>[part.type,part.value]));
  const year=Number(parts.year),month=parts.month,day=parts.day;
  const hour=Number(parts.hour),minute=Number(parts.minute);
  if(!Number.isSafeInteger(year)||!Number.isSafeInteger(hour)||!Number.isSafeInteger(minute)||
     !month||!day||!parts.weekday)return null;
  return {date:parts.year+"-"+month+"-"+day,weekday:parts.weekday,
    minuteOfDay:hour*60+minute,year};
}
export function referenceMarketHours(
  symbol:SymbolId,source:PriceSource,atMs:number
):MarketHoursReference{
  if(symbol==="BTCUSDT"){
    return {venue:source==="binance"?"Binance Spot":"Crypto reference",
      zone:"UTC",calendarStatus:"continuous-reference",
      summary:"Continuous-market convention",
      detail:"Crypto trading is commonly available around the clock; maintenance, restrictions and live feed health require provider verification. Demo prices are always illustrative.",
      sourceUrl:null,isExecutionAvailabilityConfirmed:false};
  }
  if(symbol==="AAPL"){
    const local=easternWallClock(atMs);
    if(!local||local.year!==2026){
      return {venue:"Nasdaq · AAPL",zone:"America/New_York",
        calendarStatus:"unknown",summary:"2026 reference calendar only",
        detail:"Published 2026 Nasdaq core-hours reference is not authoritative for other years or interruptions. Verify the current venue calendar.",
        sourceUrl:NASDAQ_REF,isExecutionAvailabilityConfirmed:false};
    }
    const holiday=NASDAQ_2026_HOLIDAYS.has(local.date);
    const weekday=local.weekday==="Sat"||local.weekday==="Sun";
    const early=NASDAQ_2026_EARLY_CLOSE.has(local.date);
    const coreStart=9*60+30,coreEnd=(early?13:16)*60;
    const within=!holiday&&!weekday&&local.minuteOfDay>=coreStart&&local.minuteOfDay<coreEnd;
    const status:MarketHoursReference["calendarStatus"]=holiday||weekday?"closed":
      early?"early-close":"regular";
    return {
      venue:"Nasdaq · AAPL",zone:"America/New_York",calendarStatus:status,
      summary:holiday?"Nasdaq holiday (reference)":
        weekday?"Weekend (Nasdaq regular session)":
        within?"Inside Nasdaq regular session (reference)":
        early?"Early-close day · 13:00 ET (reference)":
        "Outside Nasdaq regular session (reference)",
      detail:"Nasdaq U.S. equities core session: 09:30–16:00 ET except published holidays and 13:00 ET early closes. This is a 2026 calendar reference, not a live quote or trading-eligibility confirmation.",
      sourceUrl:NASDAQ_REF,isExecutionAvailabilityConfirmed:false
    };
  }
  if(symbol==="EURUSD"){
    return {venue:"Forex · provider unspecified",zone:"Broker-defined",
      calendarStatus:"unknown",summary:"Broker hours not configured",
      detail:"Forex sessions, weekend cutoffs and daylight saving transitions depend on the selected broker, instrument and liquidity provider. No executable market-hours assertion is available for this demonstration feed.",
      sourceUrl:null,isExecutionAvailabilityConfirmed:false};
  }
  return {venue:"US100 · unspecified CFD venue",zone:"Broker-defined",
    calendarStatus:"unknown",summary:"Contract hours not configured",
    detail:"Index CFD trading calendars and tick/contract specifications vary by broker. No live exchange or executable-market schedule has been configured for US100.",
    sourceUrl:null,isExecutionAvailabilityConfirmed:false};
}
export type PriceMetadata={
  displayDecimals:number;
  tickSize:number|null;
  venueVerified:boolean;
  note:string;
};
/** Display decimal places are NOT exchange tick sizes or FX pip values. */
export function priceMetadata(symbol:SymbolId,source:PriceSource):PriceMetadata{
  const displayDecimals=symbol==="EURUSD"?5:2;
  return {displayDecimals,tickSize:null,venueVerified:false,
    note:source==="binance"&&symbol==="BTCUSDT"?
      "Display precision only. Obtain current Binance LOT_SIZE/PRICE_FILTER tick size from validated exchangeInfo before quoting execution or sizing.":
      "Demonstration display precision only. Broker tick size, pip value and contract specifications are not configured."};
}
