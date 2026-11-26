import {PriceScaleMode} from "lightweight-charts";
export type PriceScalePreset="normal"|"log"|"percent"|"indexed";
export const priceScalePresets:PriceScalePreset[]=["normal","log","percent","indexed"];
export const priceScaleMode=(mode:PriceScalePreset):PriceScaleMode=>({
  normal:PriceScaleMode.Normal,
  log:PriceScaleMode.Logarithmic,
  percent:PriceScaleMode.Percentage,
  indexed:PriceScaleMode.IndexedTo100
})[mode];
export const priceScaleOptions=(mode:PriceScalePreset,inverted:boolean)=>({
  mode:priceScaleMode(mode),invertScale:inverted
});
export const parsePriceScalePreset=(value:unknown):PriceScalePreset=>
  typeof value==="string"&&priceScalePresets.includes(value as PriceScalePreset)
    ?value as PriceScalePreset:"normal";
