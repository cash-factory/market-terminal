import {describe,expect,it} from "vitest";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {ChartErrorBoundary} from "./ChartErrorBoundary";

describe("isolated chart recovery component",()=>{
  it("keeps healthy children intact without changing rendered chart semantics",()=>{
    const markup=renderToStaticMarkup(createElement(ChartErrorBoundary,{
      title:"Primary chart",resetKey:"EURUSD:1h:demo:candles",
      children:createElement("span",{id:"chart-test"},"Healthy chart")
    }));
    expect(markup).toContain("Healthy chart");
    expect(markup).toContain("chart-failure-scope");
    expect(markup).not.toContain("could not render");
  });
  it("recognizes an actual thrown render error without hiding its source",()=>{
    const fault=new Error("synthetic transient render failure");
    expect(ChartErrorBoundary.getDerivedStateFromError(fault).error).toBe(fault);
  });
});
