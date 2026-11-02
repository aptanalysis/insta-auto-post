import { describe, expect, it } from "vitest";
import { decideAlert, median, usualPrice } from "@/lib/pricing";

describe("median / usualPrice", () => {
  it("median handles odd/even", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(3); // (2+3)/2 = 2.5 → 3
    expect(median([])).toBeNull();
  });
  it("uses initial price until enough history", () => {
    expect(usualPrice([10000, 9000], 12000)).toBe(12000);
    expect(usualPrice([10000, 9000, 11000], 12000)).toBe(10000);
  });
  it("is robust to a one-off spike", () => {
    expect(usualPrice([10000, 10000, 10000, 50000, 10000], 10000)).toBe(10000);
  });
});

describe("decideAlert", () => {
  const base = { usual: 10000, dropPct: 5, targetPrice: null, lowestEver: 9800, lastAlertPrice: null };

  it("no alert for small fluctuation", () => {
    const d = decideAlert({ ...base, current: 9700 });
    expect(d.alert).toBe(false);
    expect(d.nextLastAlertPrice).toBeNull();
  });

  it("alerts when price drops ≥ dropPct below usual", () => {
    const d = decideAlert({ ...base, current: 9400 });
    expect(d.alert).toBe(true);
    expect(d.reasons.join()).toContain("할인");
    expect(d.reasons).toContain("역대 최저가");
    expect(d.nextLastAlertPrice).toBe(9400);
  });

  it("does not repeat alert for the same deal, but alerts on further drop", () => {
    expect(decideAlert({ ...base, current: 9400, lastAlertPrice: 9400 }).alert).toBe(false);
    expect(decideAlert({ ...base, current: 9000, lastAlertPrice: 9400 }).alert).toBe(true);
  });

  it("resets after the deal ends so the next deal alerts again", () => {
    const end = decideAlert({ ...base, current: 10000, lastAlertPrice: 9400 });
    expect(end.nextLastAlertPrice).toBeNull();
    expect(decideAlert({ ...base, current: 9400, lastAlertPrice: end.nextLastAlertPrice }).alert).toBe(true);
  });

  it("alerts on target price even when drop is small", () => {
    const d = decideAlert({ ...base, current: 9900, targetPrice: 9900 });
    expect(d.alert).toBe(true);
    expect(d.reasons).toContain("목표가 도달");
  });
});
