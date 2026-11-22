/** Bounded study parameters prevent accidental pathological calculations while
 * allowing meaningful user customization, independent of market data provider. */
export type StudyParameters={
  smaPeriod:number;
  emaPeriod:number;
  bollingerPeriod:number;
  bollingerDeviations:number;
  rsiPeriod:number;
  macdFast:number;
  macdSlow:number;
  macdSignal:number;
  atrPeriod:number;
};
export const defaultStudyParameters:StudyParameters={
  smaPeriod:20,emaPeriod:20,bollingerPeriod:20,bollingerDeviations:2,
  rsiPeriod:14,macdFast:12,macdSlow:26,macdSignal:9,atrPeriod:14
};
export const studyParameterBounds:Record<keyof StudyParameters,{min:number;max:number;step:number;label:string}>={
  smaPeriod:{min:1,max:500,step:1,label:"SMA period"},
  emaPeriod:{min:1,max:500,step:1,label:"EMA period"},
  bollingerPeriod:{min:2,max:500,step:1,label:"Bollinger window"},
  bollingerDeviations:{min:.1,max:5,step:.1,label:"Bollinger deviations"},
  rsiPeriod:{min:2,max:500,step:1,label:"RSI period"},
  macdFast:{min:2,max:100,step:1,label:"MACD fast"},
  macdSlow:{min:3,max:500,step:1,label:"MACD slow"},
  macdSignal:{min:2,max:100,step:1,label:"MACD signal"},
  atrPeriod:{min:2,max:500,step:1,label:"ATR period"}
};
export const studyParameterKeys=Object.keys(defaultStudyParameters) as (keyof StudyParameters)[];

export function parseStudyParameters(input:unknown):StudyParameters{
  const raw=input&&typeof input==="object"&&!Array.isArray(input)?
    input as Record<string,unknown>:{};
  const values={...defaultStudyParameters};
  for(const key of studyParameterKeys){
    const val=raw[key],bound=studyParameterBounds[key];
    if(typeof val!=="number"||!Number.isFinite(val)||val<bound.min||val>bound.max)continue;
    if(bound.step===1&&!Number.isSafeInteger(val))continue;
    values[key]=val;
  }
  if(values.macdFast>=values.macdSlow){
    values.macdFast=defaultStudyParameters.macdFast;
    values.macdSlow=defaultStudyParameters.macdSlow;
  }
  return values;
}
export function updateStudyParameter(
  source:StudyParameters,key:keyof StudyParameters,value:number
):StudyParameters{
  const bound=studyParameterBounds[key];
  if(!Number.isFinite(value)||value<bound.min||value>bound.max||
     (bound.step===1&&!Number.isSafeInteger(value)))
     throw new Error(bound.label+" must be between "+bound.min+" and "+bound.max+".");
  const next={...source,[key]:value};
  if(next.macdFast>=next.macdSlow)
    throw new Error("MACD fast period must be smaller than MACD slow period.");
  return next;
}
