import type { ToolGroup } from "./toolDefinitions";

/**
 * TradingView support inventory, researched Nov 2026.
 * These names describe future independent implementations, not available
 * DrawingTool IDs, licensed TradingView library APIs or provider entitlements.
 */
export const REFERENCE_BACKLOG:Record<ToolGroup,readonly string[]>={
 Lines:[
  "Trend angle","Regression trend","Flat-top / bottom channel","Disjoint channel",
  "Inside pitchfork","Schiff pitchfork","Modified Schiff pitchfork"
 ],
 Fibonacci:[
  "Fib channel","Fib speed resistance fan","Trend-based Fib time",
  "Fib speed resistance arcs","Fib wedge","Pitchfan","Fib spiral",
  "Gann fixed square","Gann square","Gann fan"
 ],
 Patterns:[
  "Cypher pattern","Head-and-shoulders","Three drives",
  "Elliott triangle wave","Elliott correction wave","Elliott combination waves",
  "Time cycles","Sine line"
 ],
 Measurement:[
  "Position forecast","Bars pattern","Ghost feed","Sector",
  "Fixed-range volume profile","Anchored volume profile","Anchored VWAP"
 ],
 Shapes:[
  "Rotated rectangle","Path","Polyline","Curve","Double curve",
  "Arc","Highlighter","Circle","Arrow mark left/right/up/down"
 ],
 Annotations:[
  "Anchored note","Pin","Table","Signpost","Comment",
  "Price label","Flag mark"
 ],
 "Icons & Markers":[
  "Stickers","Emoji collections","Custom image attachments",
  "X posts and public ideas"
 ]
};
