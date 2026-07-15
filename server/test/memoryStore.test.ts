import { describe, it, expect } from "vitest";
import { loadUserState, saveUserState, appendRecentEvent, DEMO_USER_ID } from "../src/memoryStore";
import { FakeDocClient } from "./fakeDocClient";
import type { RecentEvent, UserState } from "../src/types";

describe("loadUserState", () => {
  it("returns an empty state when no record exists", async () => {
    const doc = new FakeDocClient();
    const state = await loadUserState(doc);
    expect(state.userId).toBe(DEMO_USER_ID);
    expect(state.visitCount).toBe(0);
    expect(state.recentEvents).toEqual([]);
  });

  it("round-trips a saved state", async () => {
    const doc = new FakeDocClient();
    const state: UserState = {
      userId: DEMO_USER_ID,
      currentDate: "20250102",
      visitCount: 2,
      mainIndex: 1,
      summary: "test summary",
      recentEvents: [],
      updatedAt: new Date().toISOString(),
    };
    await saveUserState(doc, state);
    const loaded = await loadUserState(doc);
    expect(loaded.currentDate).toBe("20250102");
    expect(loaded.summary).toBe("test summary");
  });
});

describe("appendRecentEvent", () => {
  const baseState: UserState = {
    userId: DEMO_USER_ID,
    currentDate: "20250102",
    visitCount: 1,
    mainIndex: 0,
    summary: "",
    recentEvents: [],
    updatedAt: new Date(0).toISOString(),
  };

  it("adds a new event to the list", () => {
    const event: RecentEvent = { date: "20250102", beat: "feet", choice: "next", fact: "f", textExcerpt: "t" };
    const next = appendRecentEvent(baseState, event);
    expect(next.recentEvents).toHaveLength(1);
    expect(next.recentEvents[0]).toEqual(event);
  });

  it("keeps at most 5 events, dropping the oldest", () => {
    let state = baseState;
    for (let i = 0; i < 6; i++) {
      state = appendRecentEvent(state, {
        date: `2025010${i + 1}`,
        beat: "feet",
        choice: null,
        fact: `fact-${i}`,
        textExcerpt: `text-${i}`,
      });
    }
    expect(state.recentEvents).toHaveLength(5);
    expect(state.recentEvents[0].fact).toBe("fact-1");
    expect(state.recentEvents[4].fact).toBe("fact-5");
  });
});
