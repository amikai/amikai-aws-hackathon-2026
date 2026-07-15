import { describe, it, expect } from "vitest";
import { loadFixtureDataset } from "./fixtures";
import { computeFact, factToSummaryLine } from "../src/factEngine";

describe("computeFact", () => {
  const dataset = loadFixtureDataset();

  it("returns the fixed investment plan fact regardless of date", () => {
    const fact = computeFact(dataset, "plan", "20250102");
    expect(fact?.title).toBe("原本的約定");
    expect(fact?.lines).toContain("每月 10 日投入 5,000 元");
  });

  it("describes forum sentiment for the radio beat", () => {
    const fact = computeFact(dataset, "radio", "20250102");
    expect(fact?.lines[0]).toBe("1/2 · 看多 14 · 看空 0 · 中性 9");
  });

  it("describes institutional net trading direction for the feet beat", () => {
    const fact = computeFact(dataset, "feet", "20250102");
    expect(fact?.lines[0]).toContain("賣超");
    expect(fact?.lines[0]).toContain("9814.5");
  });

  it("detects a consecutive same-direction streak for the feet beat", () => {
    const fact = computeFact(dataset, "feet", "20250106");
    expect(fact?.lines[0]).toContain("買超");
    expect(fact?.lines[1]).toBe("已連續 2 天同方向買超");
  });

  it("combines weekly return and daily change for the scale beat", () => {
    const fact = computeFact(dataset, "scale", "20250102");
    expect(fact?.lines[0]).toContain("-2.119%");
    expect(fact?.lines[1]).toContain("-0.87%");
  });

  it("combines multiple facts for the diary beat", () => {
    const fact = computeFact(dataset, "diary", "20250106");
    expect(fact?.title).toBe("共同日記");
    expect(fact?.lines.some((line) => line.includes("買超"))).toBe(true);
  });

  it("returns undefined when there is no fact for the beat or the date is unknown", () => {
    expect(computeFact(dataset, "ground", "20250102")).toBeUndefined();
    expect(computeFact(dataset, "feet", "20259999")).toBeUndefined();
  });
});

describe("factToSummaryLine", () => {
  it("joins the fact block into a single line", () => {
    const dataset = loadFixtureDataset();
    const fact = computeFact(dataset, "radio", "20250102");
    expect(factToSummaryLine(fact)).toBe(
      "論壇聲量：1/2 · 看多 14 · 看空 0 · 中性 9；回文 161 則；聲量變大 ≠ 大家一致看空"
    );
  });

  it("returns a placeholder when there is no fact", () => {
    expect(factToSummaryLine(undefined)).toBe("（本次無新事實）");
  });
});
