import type { CSSProperties } from "react";

type Props = {name:string;size?:number;className?:string;style?:CSSProperties};
/** Original Peak vector glyph; button or link owns the accessible name. */
export function PeakIcon({name,size=18,className,style}:Props){
  const href=import.meta.env.BASE_URL+"assets/reference/reference-icons.svg#"+name;
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" focusable="false" aria-hidden="true" style={style}>
    <use href={href}/>
  </svg>;
}
