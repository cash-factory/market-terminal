import type { DrawingTool } from "./types";

export type ToolGroup = "Lines" | "Fibonacci" | "Shapes" | "Annotations" | "Measurement";

export type ToolDefinition = {
  id: DrawingTool;
  label: string;
  description: string;
  group: ToolGroup;
  points: 1 | 2 | 3;
  keywords: string;
};

export const TOOL_GROUPS: ToolGroup[] = [
  "Lines", "Fibonacci", "Shapes", "Annotations", "Measurement",
];

/** The shelf only lists real, implemented drawing operations, never roadmap placeholders. */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {id:"trendline",label:"Trendline",group:"Lines",points:2,
    description:"Connect two time and price anchors; drag to edit.",keywords:"trend slope"},
  {id:"ray",label:"Ray",group:"Lines",points:2,
    description:"Project a two-anchor trend forward.",keywords:"forward trend"},
  {id:"extended-line",label:"Extended line",group:"Lines",points:2,
    description:"Project a two-anchor line across the full chart.",keywords:"infinite line"},
  {id:"horizontal-line",label:"Horizontal line",group:"Lines",points:1,
    description:"Place a price reference across the plotting area.",keywords:"support resistance"},
  {id:"horizontal-ray",label:"Horizontal ray",group:"Lines",points:1,
    description:"Extend a price reference right from its anchor.",keywords:"right support resistance"},
  {id:"vertical-line",label:"Vertical line",group:"Lines",points:1,
    description:"Mark an observed candle time across the plot.",keywords:"time marker event"},
  {id:"cross-line",label:"Cross line",group:"Lines",points:1,
    description:"Mark one time and one price simultaneously.",keywords:"crosshair intersection"},
  {id:"channel",label:"Parallel channel",group:"Lines",points:3,
    description:"Define a baseline, then set its parallel offset.",keywords:"channel rails"},
  {id:"fibonacci",label:"Fibonacci retracement",group:"Fibonacci",points:2,
    description:"Map configurable-style retracement levels between anchors.",keywords:"fib levels"},
  {id:"rectangle",label:"Rectangle",group:"Shapes",points:2,
    description:"Highlight a two-anchor market region.",keywords:"zone box"},
  {id:"ellipse",label:"Ellipse",group:"Shapes",points:2,
    description:"Highlight a rounded market region.",keywords:"circle zone"},
  {id:"arrow",label:"Arrow",group:"Shapes",points:2,
    description:"Mark a directional movement on the chart.",keywords:"direction"},
  {id:"text",label:"Text note",group:"Annotations",points:1,
    description:"Attach an editable note to a market coordinate.",keywords:"comment annotation"},
  {id:"brush",label:"Freehand brush",group:"Annotations",points:2,
    description:"Draw a continuous hand-traced path.",keywords:"sketch pencil"},
  {id:"measure",label:"Price + time measure",group:"Measurement",points:2,
    description:"Measure price change, percentage and elapsed bars.",keywords:"ruler both"},
  {id:"price-range",label:"Price range",group:"Measurement",points:2,
    description:"Isolate absolute and percentage price movement.",keywords:"vertical delta percentage"},
  {id:"date-range",label:"Date range",group:"Measurement",points:2,
    description:"Compare UTC elapsed time and actual observed candle count.",keywords:"time span bars duration"},
  {id:"long-position",label:"Long position",group:"Measurement",points:2,
    description:"Illustrate entry, stop and target; no execution.",keywords:"buy risk reward"},
  {id:"short-position",label:"Short position",group:"Measurement",points:2,
    description:"Illustrate entry, stop and target; no execution.",keywords:"sell risk reward"},
];

export const TOOL_BY_ID = new Map(TOOL_DEFINITIONS.map(tool => [tool.id,tool]));
export const ONE_ANCHOR_TOOLS: ReadonlySet<DrawingTool> = new Set([
  "horizontal-line","horizontal-ray","vertical-line","cross-line","text",
]);
export const DEFAULT_FAVORITE_TOOLS: DrawingTool[] = [
  "trendline","horizontal-ray","rectangle","fibonacci","measure",
];

export function parseFavoriteTools(input: unknown): DrawingTool[] {
  if (!Array.isArray(input)) return [...DEFAULT_FAVORITE_TOOLS];
  const unique=new Set<DrawingTool>();
  for(const candidate of input){
    if(typeof candidate==="string"&&TOOL_BY_ID.has(candidate as DrawingTool))
      unique.add(candidate as DrawingTool);
  }
  return [...unique].slice(0,12);
}

export function filterDrawingTools(query: string, group?: ToolGroup): ToolDefinition[] {
  const terms=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return TOOL_DEFINITIONS.filter(tool=>{
    if(group&&tool.group!==group)return false;
    const haystack=[tool.label,tool.group,tool.description,tool.keywords].join(" ").toLowerCase();
    return terms.every(term=>haystack.includes(term));
  });
}
