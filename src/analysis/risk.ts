/**
 * Planning only: quote-currency linear P&L. Not broker lot sizing or order placement.
 * User must supply any instrument-specific contract multiplier and currency conversions.
 */
export type RiskPlannerInputs = {
  equity: string;
  riskPercent: string;
  entry: string;
  stop: string;
  target: string;
  multiplier: string;
};
export type RiskSide = "long" | "short";
export type RiskPlan = {
  side: RiskSide;
  riskCash: number;
  lossDistance: number;
  positionUnits: number;
  effectiveExposure: number;
  hypotheticalLoss: number;
  potentialProfit: number | null;
  rewardToRisk: number | null;
  targetDistance: number | null;
};

export const emptyRiskInputs: RiskPlannerInputs = {
  equity: "", riskPercent: "1", entry: "",
  stop: "", target: "", multiplier: "1"
};

export function parseRiskInputs(value: unknown): RiskPlannerInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {...emptyRiskInputs};
  const incoming = value as Record<string, unknown>;
  const output = {...emptyRiskInputs};
  for (const key of Object.keys(output) as (keyof RiskPlannerInputs)[]) {
    if (typeof incoming[key] === "string" && incoming[key].length < 60) output[key] = incoming[key];
  }
  return output;
}

function requiredFinitePositive(input: string, field: string): number {
  if (!input.trim()) throw new Error("Enter " + field + ".");
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) throw new Error(field + " must be a positive number.");
  return value;
}
export function calculateRiskPlan(input: RiskPlannerInputs): RiskPlan {
  const equity = requiredFinitePositive(input.equity, "account equity");
  const riskPercent = requiredFinitePositive(input.riskPercent, "risk percentage");
  if (riskPercent > 100) throw new Error("Risk percentage cannot exceed 100%.");
  const entry = requiredFinitePositive(input.entry, "entry price");
  const stop = requiredFinitePositive(input.stop, "stop-loss price");
  const multiplier = requiredFinitePositive(input.multiplier, "unit multiplier");
  const distance = Math.abs(entry - stop);
  if (distance < Number.EPSILON * Math.max(entry, stop)) {
    throw new Error("Entry and stop-loss must be different prices.");
  }
  const side: RiskSide = stop < entry ? "long" : "short";
  const riskCash = equity * (riskPercent / 100);
  const perUnitLoss = distance * multiplier;
  const units = riskCash / perUnitLoss;
  if (!Number.isFinite(units) || units <= 0) throw new Error("The calculated position size is outside supported numeric limits.");

  let potentialProfit: number | null = null;
  let rewardToRisk: number | null = null;
  let targetDistance: number | null = null;
  if (input.target.trim()) {
    const target = requiredFinitePositive(input.target, "take-profit price");
    if ((side === "long" && target <= entry) || (side === "short" && target >= entry)) {
      throw new Error("Target must be beyond entry in the profitable direction.");
    }
    targetDistance = Math.abs(target - entry);
    rewardToRisk = targetDistance / distance;
    potentialProfit = units * targetDistance * multiplier;
  }
  return {
    side, riskCash, lossDistance: distance,
    positionUnits: units,
    effectiveExposure: units * entry * multiplier,
    hypotheticalLoss: riskCash,
    potentialProfit, rewardToRisk, targetDistance
  };
}
