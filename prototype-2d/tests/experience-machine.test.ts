import { describe, expect, it } from "vitest";
import { experienceReducer, initialState } from "@/lib/experience-machine";
import type { ExperienceState } from "@/lib/types";

describe("experience machine", () => {
  it("初始為 ARRIVAL + STORM，窗未關", () => {
    expect(initialState.step).toBe("ARRIVAL");
    expect(initialState.market).toBe("STORM");
    expect(initialState.windowClosed).toBe(false);
  });

  it("主線：陪我看一下 → 8 格走到 REST", () => {
    let s = experienceReducer(initialState, { type: "CHOOSE_LOOK" });
    expect(s.step).toBe("GROUNDING");
    expect(s.windowClosed).toBe(true);
    for (const expected of ["PLAN_RECALL", "RADIO_EXPLORE", "FOOTPRINT_EXPLORE", "TIMESCALE", "REFLECTION"] as const) {
      s = experienceReducer(s, { type: "ADVANCE" });
      expect(s.step).toBe(expected);
    }
    // REFLECTION 不能用 ADVANCE 跳過，必須選擇
    s = experienceReducer(s, { type: "ADVANCE" });
    expect(s.step).toBe("REFLECTION");
    s = experienceReducer(s, { type: "CHOOSE_REFLECTION", choice: "WAIT" });
    expect(s.step).toBe("DIARY");
    expect(s.reflection).toBe("WAIT");
    s = experienceReducer(s, { type: "ADVANCE" });
    expect(s.step).toBe("REST");
  });

  it("分支：今天只想坐坐 → 不推送資料，直接可休息", () => {
    let s = experienceReducer(initialState, { type: "CHOOSE_SIT" });
    expect(s.step).toBe("SIT_TOGETHER");
    expect(s.windowClosed).toBe(false);
    s = experienceReducer(s, { type: "ADVANCE" });
    expect(s.step).toBe("REST");
  });

  it("任何主線狀態都能 LEAVE 到 REST", () => {
    let s = experienceReducer(initialState, { type: "CHOOSE_LOOK" });
    s = experienceReducer(s, { type: "ADVANCE" }); // PLAN_RECALL
    s = experienceReducer(s, { type: "LEAVE" });
    expect(s.step).toBe("REST");
  });

  it("TOGGLE_MARKET 切換 CALM/STORM，RESTART 保留 market 並重置其他", () => {
    let s: ExperienceState = experienceReducer(initialState, { type: "TOGGLE_MARKET" });
    expect(s.market).toBe("CALM");
    s = experienceReducer(s, { type: "CHOOSE_LOOK" });
    s = experienceReducer(s, { type: "RESTART" });
    expect(s).toEqual({ ...initialState, market: "CALM" });
  });

  it("非法轉換是 no-op：ARRIVAL 收到 ADVANCE 不動", () => {
    const s = experienceReducer(initialState, { type: "ADVANCE" });
    expect(s.step).toBe("ARRIVAL");
  });
});
