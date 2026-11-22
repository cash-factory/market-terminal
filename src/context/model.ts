import type { Level } from "../workspace";

export type PriceNeighbor={
  id:string;price:number;distance:number;distancePercent:number;
  side:"above"|"below"|"at";
};

/** User-marked levels are observations, not automatically inferred support/resistance. */
export function nearestMarkedLevels(
  levels:readonly Level[],currentPrice:number,perSide=3
):PriceNeighbor[] {
  if(!Number.isFinite(currentPrice)||currentPrice<=0||!Number.isSafeInteger(perSide)||
     perSide<1||perSide>20)return [];
  const seen=new Set<string>();
  const valid=levels.flatMap(level=>{
    if(!Number.isFinite(level.price)||level.price<=0||seen.has(level.id))return [];
    seen.add(level.id);
    const delta=level.price-currentPrice;
    const epsilon=Math.max(currentPrice*1e-12,1e-10);
    return [{
      id:level.id,price:level.price,distance:Math.abs(delta),
      distancePercent:(delta/currentPrice)*100,
      side:(Math.abs(delta)<=epsilon?"at":delta>0?"above":"below") as PriceNeighbor["side"]
    }];
  });
  const above=valid.filter(item=>item.side==="above").sort((a,b)=>a.distance-b.distance).slice(0,perSide);
  const below=valid.filter(item=>item.side==="below").sort((a,b)=>a.distance-b.distance).slice(0,perSide);
  const at=valid.filter(item=>item.side==="at").slice(0,perSide);
  return [...above,...at,...below];
}
