import {test,expect} from "@playwright/test";

test("exchange feed becomes stale on disconnect, re-fetches missing candles and returns live",async({page})=>{
  const base=Date.UTC(2026,10,23,0,0,0),minute=60_000;
  let calls=0;
  await page.route("**/api/v3/klines**",async route=>{
    calls++;
    const count=calls===1?10:12;
    const candles=Array.from({length:count},(_,i)=>{
      const t=base+i*minute;
      return [t,"100","110","99",String(101+i/10),"1",t+minute-1,"0",1,"0","0","0"];
    });
    await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(candles)});
  });
  await page.addInitScript(()=>{
    type Stub={readyState:number;onopen:((e:Event)=>void)|null;
      onclose:((e:Event)=>void)|null;onmessage:((e:MessageEvent)=>void)|null;
      close:()=>void;push:(value:unknown)=>void};
    const sockets:Stub[]=[];
    class ExchangeSocket{
      static OPEN=1;
      readyState=0;
      onopen:((e:Event)=>void)|null=null;
      onclose:((e:Event)=>void)|null=null;
      onmessage:((e:MessageEvent)=>void)|null=null;
      onerror:((e:Event)=>void)|null=null;
      constructor(_url:string){
        sockets.push(this);
        setTimeout(()=>{this.readyState=1;this.onopen?.(new Event("open"));},5);
      }
      close(){this.readyState=3;this.onclose?.(new Event("close"));}
      push(value:unknown){
        this.onmessage?.(new MessageEvent("message",{data:JSON.stringify(value)}));
      }
    }
    Object.defineProperty(window,"WebSocket",{value:ExchangeSocket,configurable:true});
    Object.assign(window,{__exchangeSocketStubs:sockets});
  });
  const push=async(index:number,t:number)=>{
    await page.evaluate(({index,t})=>{
      const sockets=(window as unknown as {__exchangeSocketStubs:Array<{push:(value:unknown)=>void}>}).__exchangeSocketStubs;
      sockets[index].push({e:"kline",s:"BTCUSDT",k:{
        s:"BTCUSDT",i:"1m",t,T:t+59_999,x:true,o:"101",h:"107",l:"100",c:"106",v:"1"
      }});
    },{index,t});
  };
  await page.goto("/market-terminal/");
  await page.getByRole("button",{name:"Open BTCUSDT chart"}).click();
  await page.getByRole("group",{name:"Quick chart intervals"}).getByRole("button",{name:"1m"}).click();
  await page.getByRole("button",{name:"Chart setup"}).click();
  await page.getByRole("group",{name:"Chart price source"}).getByRole("button",{name:"Binance Spot"}).click();
  await expect.poll(()=>calls).toBeGreaterThanOrEqual(1);
  await expect.poll(async()=>page.evaluate(()=>(
    (window as unknown as {__exchangeSocketStubs:unknown[]}).__exchangeSocketStubs.length
  ))).toBeGreaterThanOrEqual(1);
  await push(0,base+10*minute);
  await expect(page.locator(".demo-tag")).toContainText("LIVE");
  await page.evaluate(()=>{
    const sockets=(window as unknown as {__exchangeSocketStubs:Array<{close:()=>void}>}).__exchangeSocketStubs;
    sockets[0].close();
  });
  await expect(page.locator(".demo-tag")).toContainText("STALE");
  await expect.poll(()=>calls,{timeout:10_000}).toBeGreaterThanOrEqual(2);
  await expect.poll(async()=>page.evaluate(()=>(
    (window as unknown as {__exchangeSocketStubs:unknown[]}).__exchangeSocketStubs.length
  )),{timeout:10_000}).toBeGreaterThanOrEqual(2);
  await push(1,base+12*minute);
  await expect(page.locator(".demo-tag")).toContainText("LIVE");
  await expect(page.getByText("SYNTHETIC DATA",{exact:true})).toHaveCount(0);
});
