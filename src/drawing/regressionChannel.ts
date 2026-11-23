/** Least-squares close-price study over *observed* candles only.
 * No synthetic observations, future prices, or volume assumptions.
 * x measures observed bar index so missing calendar intervals do not fake samples.
 */
export type RegressionSample={time:number;close:number};
export type RegressionFit={
  count:number;fromTime:number;toTime:number;
  first:number;last:number;deviation:number;slopePerObservedBar:number;
};
export function fitRegressionChannel(
  rows:readonly RegressionSample[],fromTime:number,toTime:number
):RegressionFit|null{
  if(!Number.isFinite(fromTime)||!Number.isFinite(toTime))return null;
  const lo=Math.min(fromTime,toTime),hi=Math.max(fromTime,toTime);
  const selected=rows.filter(row=>Number.isFinite(row.close)&&row.close>0&&
    Number.isFinite(row.time)&&row.time>=lo&&row.time<=hi);
  if(selected.length<3)return null;
  for(let i=1;i<selected.length;i++)if(selected[i].time<=selected[i-1].time)return null;
  const n=selected.length;
  const meanX=(n-1)/2;
  const meanY=selected.reduce((sum,row)=>sum+row.close,0)/n;
  let varianceX=0,covariance=0;
  for(let i=0;i<n;i++){
    const dx=i-meanX;
    varianceX+=dx*dx;
    covariance+=dx*(selected[i].close-meanY);
  }
  if(varianceX<=0)return null;
  const slope=covariance/varianceX;
  const first=meanY-slope*meanX,last=first+slope*(n-1);
  let residual=0;
  for(let i=0;i<n;i++){
    const error=selected[i].close-(first+slope*i);
    residual+=error*error;
  }
  const deviation=Math.sqrt(residual/n);
  if(![first,last,slope,deviation].every(Number.isFinite))return null;
  return {count:n,fromTime:selected[0].time,toTime:selected[n-1].time,
    first,last,deviation,slopePerObservedBar:slope};
}
