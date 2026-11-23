import type {DrawingTool} from "./types";
export function moveFavorite(list:DrawingTool[],from:DrawingTool,to:DrawingTool):DrawingTool[]{
 const start=list.indexOf(from),end=list.indexOf(to);
 if(start<0||end<0||start===end)return list;
 const next=[...list];next.splice(start,1);next.splice(end,0,from);return next;
}
