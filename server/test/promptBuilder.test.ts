import { describe, it, expect } from "vitest";
import { buildBeatPrompt } from "../src/promptBuilder";
import { computeFact } from "../src/factEngine";
import { loadFixtureDataset } from "./fixtures";
import type { UserState } from "../src/types";

const emptyState: UserState = {
  userId: "demo_user",
  currentDate: "20250102",
  visitCount: 1,
  mainIndex: 0,
  summary: "",
  recentEvents: [],
  updatedAt: new Date(0).toISOString(),
};

describe("buildBeatPrompt", () => {
  it("includes the date, fact, and beat goal for a fresh session", () => {
    const dataset = loadFixtureDataset();
    const fact = computeFact(dataset, "feet", "20250102");
    const { system, user } = buildBeatPrompt("feet", "20250102", fact, emptyState, undefined);
    expect(system).toContain("股伴");
    expect(user).toContain("2025/01/02");
    expect(user).toContain("三大法人合計賣超");
    expect(user).toContain("描述法人買賣超方向與連續性");
    expect(user).toContain("尚無過去紀錄");
  });

  it("includes the previous choice when provided", () => {
    const { user } = buildBeatPrompt("radio", "20250103", undefined, emptyState, "next");
    expect(user).toContain("玩家上一步選擇：「next」");
  });

  it("includes the memory summary and recent events when present", () => {
    const state: UserState = {
      ...emptyState,
      summary: "使用者對法人賣超感到擔心",
      recentEvents: [
        { date: "20250102", beat: "feet", choice: "next", fact: "法人動向：賣超9814.5張", textExcerpt: "..." },
      ],
    };
    const { user } = buildBeatPrompt("plan", "20250103", undefined, state, "next");
    expect(user).toContain("使用者對法人賣超感到擔心");
    expect(user).toContain("feet");
  });

  it("shows a placeholder fact line when there is no fact for the beat", () => {
    const { user } = buildBeatPrompt("ground", "20250102", undefined, emptyState, undefined);
    expect(user).toContain("已確認事實：（本次無新事實）");
  });
});
