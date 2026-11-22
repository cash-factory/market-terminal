export type Point2D={x:number;y:number};
export type PlotSize={width:number;height:number};
const EPS=1e-8;

const safePlot=(plot:PlotSize):boolean=>
  Number.isFinite(plot.width)&&Number.isFinite(plot.height)&&plot.width>0&&plot.height>0;
const pointIsFinite=(p:Point2D):boolean=>Number.isFinite(p.x)&&Number.isFinite(p.y);

/** Clip an infinite straight line to the visible chart plot without extrapolating exchange data. */
export function clippedExtendedLine(
  a:Point2D,b:Point2D,plot:PlotSize
):{start:Point2D;end:Point2D}|null{
  if(!safePlot(plot)||!pointIsFinite(a)||!pointIsFinite(b))return null;
  const dx=b.x-a.x,dy=b.y-a.y;
  if(Math.hypot(dx,dy)<EPS)return null;
  const crossings:{t:number;p:Point2D}[]=[];
  const add=(t:number)=>{
    const x=a.x+t*dx,y=a.y+t*dy;
    if(Number.isFinite(t)&&x>=-EPS&&x<=plot.width+EPS&&
       y>=-EPS&&y<=plot.height+EPS){
      if(!crossings.some(p=>Math.abs(p.t-t)<EPS))
        crossings.push({t,p:{x:Math.max(0,Math.min(plot.width,x)),
          y:Math.max(0,Math.min(plot.height,y))}});
    }
  };
  if(Math.abs(dx)>EPS){add((0-a.x)/dx);add((plot.width-a.x)/dx);}
  if(Math.abs(dy)>EPS){add((0-a.y)/dy);add((plot.height-a.y)/dy);}
  if(crossings.length<2)return null;
  crossings.sort((p,q)=>p.t-q.t);
  return {start:crossings[0].p,end:crossings[crossings.length-1].p};
}

export function horizontalReference(
  anchor:Point2D,plot:PlotSize,ray:boolean
):{start:Point2D;end:Point2D}|null{
  if(!safePlot(plot)||!pointIsFinite(anchor)||anchor.y<0||anchor.y>plot.height)return null;
  if(ray&&anchor.x>plot.width)return null;
  const left=ray?Math.max(0,anchor.x):0;
  if(left>=plot.width)return null;
  return {start:{x:left,y:anchor.y},end:{x:plot.width,y:anchor.y}};
}

export function verticalReference(
  anchor:Point2D,plot:PlotSize
):{start:Point2D;end:Point2D}|null{
  if(!safePlot(plot)||!pointIsFinite(anchor)||anchor.x<0||anchor.x>plot.width)return null;
  return {start:{x:anchor.x,y:0},end:{x:anchor.x,y:plot.height}};
}

/** Count actual normalized ascending candle timestamps, not theoretical
 * intervals across weekends, exchange closures or missing feed history.
 * Binary search avoids scanning every candle for each visible drawing.
 */
export function observedBarCount(
  times:readonly number[],startSeconds:number,endSeconds:number
):number{
  if(!Number.isFinite(startSeconds)||!Number.isFinite(endSeconds))return 0;
  const lo=Math.min(startSeconds,endSeconds),hi=Math.max(startSeconds,endSeconds);
  let left=0,right=times.length;
  while(left<right){
    const mid=(left+right)>>>1;
    if(times[mid]<lo)left=mid+1;
    else right=mid;
  }
  const start=left;
  right=times.length;
  while(left<right){
    const mid=(left+right)>>>1;
    if(times[mid]<=hi)left=mid+1;
    else right=mid;
  }
  return left-start;
}

export function formatElapsedDuration(seconds:number):string{
  if(!Number.isFinite(seconds)||seconds<0)return "—";
  const whole=Math.floor(seconds);
  const days=Math.floor(whole/86400);
  const hours=Math.floor((whole%86400)/3600);
  const minutes=Math.floor((whole%3600)/60);
  const parts=[days?days+"d":"",hours?hours+"h":"",minutes?minutes+"m":""].filter(Boolean);
  return parts.join(" ")||whole+"s";
}
