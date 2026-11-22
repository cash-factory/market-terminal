import type { CandlestickData, HistogramData, LineData, UTCTimestamp } from "lightweight-charts";

/** Deterministic, source-agnostic technical studies using closed or current OHLC bars.
 * Results include the still-forming bar, if one is supplied. These are analytical
 * outputs, not trading signals or guarantees.
 */
type Bar = CandlestickData<UTCTimestamp>;
type Point = LineData<UTCTimestamp>;

function checkPeriod(period: number): void {
  if (!Number.isSafeInteger(period) || period < 1 || period > 100_000)
    throw new Error("Indicator period must be an integer between 1 and 100,000.");
}
function finite(values: readonly Bar[]): boolean {
  return values.every(c => [c.open,c.high,c.low,c.close].every(Number.isFinite));
}

export function movingAverage(bars: readonly Bar[], period: number): Point[] {
  checkPeriod(period);
  if (bars.length < period || !finite(bars)) return [];
  const out: Point[] = [];
  let sum = 0;
  for (let i=0;i<bars.length;i++) {
    sum += bars[i].close;
    if (i >= period) sum -= bars[i-period].close;
    if (i >= period-1) out.push({time:bars[i].time, value:sum/period});
  }
  return out;
}

export function emaSeries(values: readonly {time:UTCTimestamp;value:number}[],period:number): Point[] {
  checkPeriod(period);
  if (values.length < period) return [];
  if (!values.every(x=>Number.isFinite(x.value))) return [];
  const result:Point[]=[];
  let sum=0;
  for(let i=0;i<period;i++)sum+=values[i].value;
  let average=sum/period;
  result.push({time:values[period-1].time,value:average});
  const alpha=2/(period+1);
  for(let i=period;i<values.length;i++){
    average+=(values[i].value-average)*alpha;
    result.push({time:values[i].time,value:average});
  }
  return result;
}
export function ema(bars:readonly Bar[],period:number):Point[]{
  return emaSeries(bars.map(b=>({time:b.time,value:b.close})),period);
}

export type BollingerBands={middle:Point[];upper:Point[];lower:Point[]};
export function bollingerBands(bars:readonly Bar[],period=20,deviations=2):BollingerBands{
  checkPeriod(period);
  if(!Number.isFinite(deviations)||deviations<=0)throw new Error("Bollinger deviation multiplier must be positive.");
  const middle=movingAverage(bars,period), upper:Point[]=[],lower:Point[]=[];
  for(let i=period-1;i<bars.length&&middle.length;i++){
    const mean=middle[i-period+1].value;
    let sumSquares=0;
    for(let j=i-period+1;j<=i;j++){
      const delta=bars[j].close-mean;
      sumSquares+=delta*delta;
    }
    const spread=Math.sqrt(sumSquares/period)*deviations;
    upper.push({time:bars[i].time,value:mean+spread});
    lower.push({time:bars[i].time,value:mean-spread});
  }
  return {middle,upper,lower};
}

/** Wilder's RSI, seeded using period closing-price changes. */
export function rsi(bars:readonly Bar[],period=14):Point[]{
  checkPeriod(period);
  if(bars.length<=period||!finite(bars))return [];
  let gains=0, losses=0;
  for(let i=1;i<=period;i++){
    const delta=bars[i].close-bars[i-1].close;
    gains+=Math.max(0,delta);
    losses+=Math.max(0,-delta);
  }
  gains/=period;losses/=period;
  const out:Point[]=[];
  const value=()=>gains===0&&losses===0?50:losses===0?100:100-(100/(1+gains/losses));
  out.push({time:bars[period].time,value:value()});
  for(let i=period+1;i<bars.length;i++){
    const delta=bars[i].close-bars[i-1].close;
    gains=(gains*(period-1)+Math.max(0,delta))/period;
    losses=(losses*(period-1)+Math.max(0,-delta))/period;
    out.push({time:bars[i].time,value:value()});
  }
  return out;
}

export type Macd={macd:Point[];signal:Point[];histogram:HistogramData<UTCTimestamp>[]};
export function macd(bars:readonly Bar[],fast=12,slow=26,signalPeriod=9):Macd{
  checkPeriod(fast);checkPeriod(slow);checkPeriod(signalPeriod);
  if(fast>=slow)throw new Error("MACD fast period must be shorter than slow period.");
  const f=ema(bars,fast),s=ema(bars,slow);
  const byTime=new Map(f.map(p=>[Number(p.time),p.value]));
  const macd:Point[]=s.filter(p=>byTime.has(Number(p.time))).map(p=>({
    time:p.time,value:byTime.get(Number(p.time))!-p.value
  }));
  const signal=emaSeries(macd,signalPeriod);
  const signalAt=new Map(signal.map(p=>[Number(p.time),p.value]));
  const histogram:HistogramData<UTCTimestamp>[] = macd.filter(p=>signalAt.has(Number(p.time))).map(p=>{
    const v=p.value-signalAt.get(Number(p.time))!;
    return {time:p.time,value:v,color:v>=0?"#21ad91":"#df7180"};
  });
  return {macd,signal,histogram};
}

/** Wilder's ATR: first TR uses its own range; subsequent TR references previous close. */
export function atr(bars:readonly Bar[],period=14):Point[]{
  checkPeriod(period);
  if(bars.length<period||!finite(bars))return [];
  const trueRanges=bars.map((c,i)=>i===0?c.high-c.low:
    Math.max(c.high-c.low,Math.abs(c.high-bars[i-1].close),Math.abs(c.low-bars[i-1].close)));
  let value=trueRanges.slice(0,period).reduce((a,b)=>a+b,0)/period;
  const out:Point[]=[{time:bars[period-1].time,value}];
  for(let i=period;i<bars.length;i++){
    value=(value*(period-1)+trueRanges[i])/period;
    out.push({time:bars[i].time,value});
  }
  return out;
}

export type StudySettings = {
  ema20:boolean;
  bollinger20:boolean;
  rsi14:boolean;
  macd:boolean;
  atr14:boolean;
};
export const defaultStudies: StudySettings = {
  ema20:false,bollinger20:false,rsi14:false,macd:false,atr14:false
};
export const studyLabels: Record<keyof StudySettings,string>={
  ema20:"EMA 20",bollinger20:"Bollinger Bands 20",rsi14:"RSI 14",macd:"MACD 12/26/9",atr14:"ATR 14"
};
export function parseStudies(value: unknown):StudySettings{
  if(!value||typeof value!=="object"||Array.isArray(value))return {...defaultStudies};
  const raw=value as Record<string,unknown>;
  return Object.fromEntries(Object.entries(defaultStudies).map(([key,enabled])=>
    [key,typeof raw[key]==="boolean"?raw[key]:enabled])) as StudySettings;
}
