import { describe, expect, it } from "vitest";
import { calculateRiskPlan, emptyRiskInputs, parseRiskInputs, type RiskPlannerInputs } from "./risk";
import { defaultWorkspace, parseWorkspace, serializeWorkspace } from "../workspace";

const inputs = (patch: Partial<RiskPlannerInputs> = {}): RiskPlannerInputs => ({
  equity: "10000", riskPercent: "1", entry: "100", stop: "98", target: "104", multiplier: "1", ...patch
});

describe("theoretical position and risk planning", () => {
  it("calculates a long setup in quote-currency units without hidden broker assumptions", () => {
    const plan = calculateRiskPlan(inputs());
    expect(plan.side).toBe("long");
    expect(plan.riskCash).toBe(100);
    expect(plan.lossDistance).toBe(2);
    expect(plan.positionUnits).toBe(50);
    expect(plan.effectiveExposure).toBe(5000);
    expect(plan.potentialProfit).toBe(200);
    expect(plan.rewardToRisk).toBe(2);
  });
  it("calculates short positions with an explicit contract multiplier", () => {
    const plan = calculateRiskPlan(inputs({
      equity:"25000", riskPercent:"2", entry:"100", stop:"105", target:"90", multiplier:"10"
    }));
    expect(plan.side).toBe("short");
    expect(plan.riskCash).toBe(500);
    expect(plan.positionUnits).toBe(10);
    expect(plan.rewardToRisk).toBe(2);
    expect(plan.potentialProfit).toBe(1000);
  });
  it("supports an omitted take-profit without manufacturing a reward ratio", () => {
    const plan = calculateRiskPlan(inputs({target:""}));
    expect(plan.rewardToRisk).toBeNull();
    expect(plan.targetDistance).toBeNull();
    expect(plan.potentialProfit).toBeNull();
  });
  it("rejects nonsensical inputs instead of displaying misleading financial values", () => {
    expect(() => calculateRiskPlan(inputs({riskPercent:"101"}))).toThrow("100%");
    expect(() => calculateRiskPlan(inputs({stop:"100"}))).toThrow("different");
    expect(() => calculateRiskPlan(inputs({target:"95"}))).toThrow("profitable");
    expect(() => calculateRiskPlan(inputs({multiplier:"0"}))).toThrow("positive");
    expect(() => calculateRiskPlan(inputs({equity:"Infinity"}))).toThrow("positive");
    expect(() => calculateRiskPlan(inputs({equity:"-100"}))).toThrow("positive");
  });
  it("persists planner inputs with workspaces and safely migrates missing values", () => {
    const source = {...defaultWorkspace, riskPlanner:inputs()};
    const restored = parseWorkspace(JSON.parse(serializeWorkspace(source)));
    expect(restored).toEqual(source);
    expect(parseWorkspace({}).riskPlanner).toEqual(emptyRiskInputs);
    expect(parseRiskInputs({equity:35,stop:"98"})).toMatchObject({equity:"",stop:"98"});
  });
});
