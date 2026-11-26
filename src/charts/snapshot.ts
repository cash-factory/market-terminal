import type {IChartApi} from "lightweight-charts";
import type {Frame,SymbolId} from "../market";

export type SnapshotSource="demo"|"binance";
export const snapshotFilename=(symbol:SymbolId,frame:Frame,source:SnapshotSource)=>
  "market-terminal-"+symbol+"-"+source+"-"+frame+".png";
export const snapshotAttribution=(symbol:SymbolId,frame:Frame,source:SnapshotSource)=>
  "MARKET TERMINAL  /  "+symbol+"  /  "+frame.toUpperCase()+"  /  "+
    (source==="demo"?"SYNTHETIC DEMONSTRATION DATA":"BINANCE PUBLIC SPOT");

function canvasBlob(canvas:HTMLCanvasElement):Promise<Blob>{
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>
    blob?resolve(blob):reject(new Error("The browser could not encode the chart image.")),"image/png"));
}
function loadSvgImage(svg:SVGSVGElement):Promise<HTMLImageElement>{
  const clone=svg.cloneNode(true) as SVGSVGElement;
  const box=svg.getBoundingClientRect();
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
  clone.setAttribute("width",String(Math.max(1,box.width)));
  clone.setAttribute("height",String(Math.max(1,box.height)));
  clone.setAttribute("viewBox","0 0 "+Math.max(1,box.width)+" "+Math.max(1,box.height));
  const style=getComputedStyle(svg);
  clone.setAttribute("style",[
    "--panel:"+style.getPropertyValue("--panel").trim(),
    "--soft:"+style.getPropertyValue("--soft").trim(),
    "--text:"+style.getPropertyValue("--text").trim(),
    "--accent:"+style.getPropertyValue("--accent").trim()
  ].join(";"));
  // Drawing handles, transparent hit-targets and transient anchor hints are UI,
  // not user-created chart annotations. Exclude them from the saved image.
  clone.querySelectorAll(".drawing-hit,.drawing-handle,.drawing-plot-surface,.drawing-anchor-progress")
    .forEach(node=>node.remove());
  const text=new XMLSerializer().serializeToString(clone);
  const blob=new Blob([text],{type:"image/svg+xml;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  return new Promise((resolve,reject)=>{
    const image=new Image();
    image.onload=()=>{URL.revokeObjectURL(url);resolve(image);};
    image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Drawing annotations could not be rendered into PNG."));};
    image.src=url;
  });
}

/** Chart pixels + the visible, user-owned SVG drawing layer; never fetch remote TradingView assets. */
export async function captureChartPng(chart:IChartApi,overlay:SVGSVGElement|null,
  caption:string,dark:boolean):Promise<Blob>{
  const source=chart.takeScreenshot();
  if(!source.width||!source.height)throw new Error("The chart has not finished rendering.");
  const footer=Math.max(30,Math.round(source.height*.055));
  const output=document.createElement("canvas");
  output.width=source.width;
  output.height=source.height+footer;
  const ctx=output.getContext("2d");
  if(!ctx)throw new Error("Chart image export requires Canvas 2D support.");
  ctx.drawImage(source,0,0);
  if(overlay){
    const image=await loadSvgImage(overlay);
    ctx.drawImage(image,0,0,source.width,source.height);
  }
  ctx.fillStyle=dark?"#151c24":"#f3f6f8";
  ctx.fillRect(0,source.height,source.width,footer);
  ctx.fillStyle=dark?"#b8c3ce":"#45576a";
  ctx.textBaseline="middle";
  ctx.font=Math.max(11,Math.round(footer*.33))+"px system-ui, sans-serif";
  ctx.fillText(caption,Math.max(8,Math.round(footer*.32)),source.height+footer/2,
    Math.max(1,source.width-24));
  return canvasBlob(output);
}
