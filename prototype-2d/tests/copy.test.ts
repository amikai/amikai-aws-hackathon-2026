import { describe, expect, it } from "vitest";
import { restCopy, stepCopy } from "@/lib/copy";
import type { StoryStep } from "@/lib/types";

const steps: Exclude<StoryStep, "REST">[] = [
  "ARRIVAL", "SIT_TOGETHER", "GROUNDING", "PLAN_RECALL",
  "RADIO_EXPLORE", "FOOTPRINT_EXPLORE", "TIMESCALE", "REFLECTION", "DIARY",
];

describe("copy", () => {
  it("每個非 REST 步驟都有台詞與至少一個選項", () => {
    for (const step of steps) {
      expect(stepCopy[step].dialogue.length).toBeGreaterThan(0);
      expect(stepCopy[step].options.length).toBeGreaterThanOrEqual(1);
      expect(stepCopy[step].options.length).toBeLessThanOrEqual(4);
    }
  });

  it("REFLECTION 有四個反思選項且都導向 CHOOSE_REFLECTION", () => {
    expect(stepCopy.REFLECTION.options).toHaveLength(4);
    for (const opt of stepCopy.REFLECTION.options) {
      expect(opt.action.type).toBe("CHOOSE_REFLECTION");
    }
  });

  it("REST 提供重新開始", () => {
    expect(restCopy.options[0].action.type).toBe("RESTART");
  });
});
