import type {Point2D,PlotSize} from "./precision";

/** Three manually placed pivots. Median from the first pivot to the average of
 * the second and third; upper/lower rails use the same displacement vector.
 * This is visual geometry, not support/resistance detection or forecasting.
 */
export function medianPitchfork(a:Point2D,b:Point2D,c:Point2D):{
  mid:Point2D; vector:Point2D;origins:Point2D[]
}|null{
  const vals=[a.x,a.y,b.x,b.y,c.x,c.y];
  if(!vals.every(Number.isFinite))return null;
  const mid={x:(b.x+c.x)/2,y:(b.y+c.y)/2};
  const vector={x:mid.x-a.x,y:mid.y-a.y};
  if(Math.hypot(vector.x,vector.y)<1e-8)return null;
  return {mid,vector,origins:[a,b,c]};
}

export function fibTimePositions(x0:number,x1:number,plotWidth:number,
  levels:readonly number[]):{level:number;x:number}[]{
  if(![x0,x1,plotWidth].every(Number.isFinite)||plotWidth<=0||Math.abs(x1-x0)<1e-8)return [];
  const span=Math.abs(x1-x0);
  const start=Math.min(x0,x1);
  return levels.map(level=>({level,x:start+level*span}))
    .filter(item=>item.level>=0&&item.x>=0&&item.x<=plotWidth);
}

export function cycleLinePositions(x0:number,x1:number,plotWidth:number):number[]{
  if(![x0,x1,plotWidth].every(Number.isFinite)||plotWidth<=0)return [];
  const step=Math.abs(x1-x0);
  if(step<1||step>plotWidth*100)return [];
  const first=Math.min(x0,x1);
  const count=Math.min(64,Math.ceil(plotWidth/step)+2);
  const result:number[]=[];
  for(let i=0;i<count;i++){
    const x=first+i*step;
    if(x>=0&&x<=plotWidth)result.push(x);
    if(x>plotWidth)break;
  }
  return result;
}

export function gannGrid(plot:PlotSize,a:Point2D,b:Point2D):{
  vertical:number[];horizontal:number[];diag:[Point2D,Point2D][]
}|null{
  if(![plot.width,plot.height,a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
  const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x);
  const top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);
  if(right-left<1||bottom-top<1)return null;
  const vertical=[.25,.5,.75].map(p=>left+(right-left)*p);
  const horizontal=[.25,.5,.75].map(p=>top+(bottom-top)*p);
  return {vertical,horizontal,diag:[
    [{x:left,y:bottom},{x:right,y:top}],
    [{x:left,y:top},{x:right,y:bottom}]
  ]};
}
