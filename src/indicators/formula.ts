import type {CandlestickData,LineData,UTCTimestamp} from "lightweight-charts";

/**
 * Tiny expression DSL: arithmetic, OHLC fields, SMA/EMA, ABS, MIN and MAX.
 * No JavaScript execution, globals, plugins, web access, loops or function calls
 * other than explicitly handled operators.
 */
export type CustomStudy = {
  id:string;
  name:string;
  expression:string;
  color:string;
  enabled:boolean;
};
type Candle=CandlestickData<UTCTimestamp>;
type Node=
  |{kind:"field";field:"open"|"high"|"low"|"close"|"hl2"|"ohlc4"}
  |{kind:"number";value:number}
  |{kind:"unary";input:Node}
  |{kind:"binary";op:"+"|"-"|"*"|"/";left:Node;right:Node}
  |{kind:"sma"|"ema";input:Node;period:number}
  |{kind:"abs";input:Node}
  |{kind:"min"|"max";left:Node;right:Node};

const operators=new Set(["+","-","*","/"]);
const fields=new Set(["open","high","low","close","hl2","ohlc4"]);
const hex=/^#[0-9a-fA-F]{6}$/;

export function compileFormula(expression:string):Node {
  if(typeof expression!=="string"||!expression.trim()||expression.length>256)
    throw new Error("Formula must contain 1–256 characters.");
  const tokens:string[]=[];
  const token=/\s*([A-Za-z_][A-Za-z_0-9]*|(?:\d+(?:\.\d+)?|\.\d+)|[()+\-*/,])\s*/y;
  for(let i=0;i<expression.length;){
    token.lastIndex=i;
    const found=token.exec(expression);
    if(!found)throw new Error("Formula contains an unsupported token.");
    tokens.push(found[1]);i=token.lastIndex;
    if(tokens.length>128)throw new Error("Formula is too complex.");
  }
  let cursor=0,nodes=0;
  const consume=(value?:string):string=>{
    const t=tokens[cursor];
    if(t===undefined||(value!==undefined&&t!==value))
      throw new Error(value?"Expected '"+value+"' in formula.":"Incomplete formula.");
    cursor++;return t;
  };
  const make=<T extends Node>(n:T):T=>{
    nodes++;if(nodes>80)throw new Error("Formula has too many operations.");return n;
  };
  const parseExpression=(depth:number):Node=>{
    let left=parseTerm(depth+1);
    while(tokens[cursor]==="+"||tokens[cursor]==="-"){
      const op=consume() as "+"|"-";
      left=make({kind:"binary",op,left,right:parseTerm(depth+1)});
    }
    return left;
  };
  const parseTerm=(depth:number):Node=>{
    let left=parseUnary(depth+1);
    while(tokens[cursor]==="*"||tokens[cursor]==="/"){
      const op=consume() as "*"|"/";
      left=make({kind:"binary",op,left,right:parseUnary(depth+1)});
    }
    return left;
  };
  const parseUnary=(depth:number):Node=>{
    if(depth>35)throw new Error("Formula nesting is too deep.");
    if(tokens[cursor]==="-"){consume("-");return make({kind:"unary",input:parseUnary(depth+1)});}
    if(tokens[cursor]==="+"){consume("+");return parseUnary(depth+1);}
    return parseAtom(depth+1);
  };
  const parseAtom=(depth:number):Node=>{
    if(depth>35)throw new Error("Formula nesting is too deep.");
    const current=consume();
    if(current==="("){
      const n=parseExpression(depth+1);consume(")");return n;
    }
    if(/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(current)){
      const value=Number(current);
      if(!Number.isFinite(value))throw new Error("Formula number is too large.");
      return make({kind:"number",value});
    }
    const name=current.toLowerCase();
    if(fields.has(name))return make({kind:"field",field:name as "open"|"high"|"low"|"close"|"hl2"|"ohlc4"});
    if(!["sma","ema","abs","min","max"].includes(name))
      throw new Error("Unknown field or function: "+current+".");
    consume("(");
    const first=parseExpression(depth+1);
    if(name==="abs"){consume(")");return make({kind:"abs",input:first});}
    consume(",");
    if(name==="sma"||name==="ema"){
      const literal=consume(),period=Number(literal);
      if(!/^\d+$/.test(literal)||!Number.isSafeInteger(period)||period<1||period>500)
        throw new Error("Study period must be an integer from 1 to 500.");
      consume(")");
      return make({kind:name,period,input:first} as Node);
    }
    const second=parseExpression(depth+1);consume(")");
    return make({kind:name as "min"|"max",left:first,right:second});
  };
  const ast=parseExpression(0);
  if(cursor!==tokens.length)throw new Error("Unexpected token after formula.");
  return ast;
}

export function evaluateFormula(
  expression:string,bars:readonly Candle[]
):LineData<UTCTimestamp>[] {
  const ast=compileFormula(expression);
  if(!bars.length)return [];
  const n=bars.length;
  const evaluate=(node:Node):number[]=>{
    switch(node.kind){
      case "number":return Array(n).fill(node.value) as number[];
      case "field":return bars.map(b=>node.field==="hl2"?(b.high+b.low)/2:
        node.field==="ohlc4"?(b.open+b.high+b.low+b.close)/4:b[node.field]);
      case "unary":return evaluate(node.input).map(v=>-v);
      case "binary":{
        const a=evaluate(node.left),b=evaluate(node.right);
        return a.map((v,i)=>node.op==="+"?v+b[i]:node.op==="-"?v-b[i]:
          node.op==="*"?v*b[i]:b[i]===0?Number.NaN:v/b[i]);
      }
      case "abs":return evaluate(node.input).map(Math.abs);
      case "min":case "max":{
        const a=evaluate(node.left),b=evaluate(node.right);
        return a.map((v,i)=>node.kind==="min"?Math.min(v,b[i]):Math.max(v,b[i]));
      }
      case "sma":{
        const data=evaluate(node.input),out=Array(n).fill(Number.NaN) as number[];
        let sum=0,invalid=0;
        for(let i=0;i<n;i++){
          const v=data[i];if(Number.isFinite(v))sum+=v;else invalid++;
          if(i>=node.period){
            const previous=data[i-node.period];
            if(Number.isFinite(previous))sum-=previous;else invalid--;
          }
          if(i>=node.period-1&&invalid===0)out[i]=sum/node.period;
        }
        return out;
      }
      case "ema":{
        const data=evaluate(node.input),out=Array(n).fill(Number.NaN) as number[];
        let warmup=0,sum=0,average=Number.NaN;
        const alpha=2/(node.period+1);
        for(let i=0;i<n;i++){
          const value=data[i];
          if(!Number.isFinite(value)){warmup=0;sum=0;average=Number.NaN;continue;}
          if(!Number.isFinite(average)){
            warmup++;sum+=value;
            if(warmup===node.period){average=sum/node.period;out[i]=average;}
          }else{
            average+=(value-average)*alpha;out[i]=average;
          }
        }
        return out;
      }
    }
  };
  const values=evaluate(ast);
  return bars.flatMap((bar,i)=>Number.isFinite(values[i])?
    [{time:bar.time,value:values[i]}]:[]);
}

export function createCustomStudy(
  id:string,name:string,expression:string,color:string,enabled=true
):CustomStudy {
  if(!id||id.length>128||!id.startsWith("custom:"))
    throw new Error("Invalid custom study identifier.");
  if(!name.trim()||name.trim().length>80)throw new Error("Study name must be 1–80 characters.");
  if(!hex.test(color))throw new Error("Select a valid hex color.");
  compileFormula(expression);
  return {id,name:name.trim(),expression:expression.trim(),color,enabled};
}
export function parseCustomStudies(input:unknown):CustomStudy[]{
  if(!Array.isArray(input))return [];
  const seen=new Set<string>(),out:CustomStudy[]=[];
  for(const raw of input){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))continue;
    const v=raw as Record<string,unknown>;
    if(typeof v.id!=="string"||seen.has(v.id)||typeof v.name!=="string"||
       typeof v.expression!=="string"||typeof v.color!=="string"||typeof v.enabled!=="boolean")
      continue;
    try{
      const study=createCustomStudy(v.id,v.name,v.expression,v.color,v.enabled);
      out.push(study);seen.add(study.id);
    }catch{/* invalid saved formula is ignored rather than executed */}
  }
  return out;
}
