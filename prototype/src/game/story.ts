/**
 * Shortest demo path (sit branch):
 *   ARRIVAL → (sit | look soft-bridge) → QUIET → REST
 *
 * Copy aligned with primary-user-journey.md.
 * Explore path later; "陪我看一下" soft-lands into sit for now.
 */

export type StoryStep = "arrival" | "sit_reply" | "look_reply" | "rest";

export type ChoiceDef = {
  id: string;
  label: string;
  /** Visual weight: primary = filled soft green tone */
  primary?: boolean;
};

export type DialogueDef = {
  speaker?: string;
  text: string;
  choices?: ChoiceDef[];
};

export const DIALOGUE: Record<StoryStep, DialogueDef> = {
  arrival: {
    speaker: "小伴",
    text: "你來了。今天外面的風有點大——我們先什麼都不用做。",
    choices: [
      { id: "sit", label: "今天只想坐坐", primary: true },
      { id: "look", label: "陪我看一下" },
    ],
  },
  sit_reply: {
    speaker: "小伴",
    text: "好。那我們就這樣坐一會兒。不用急著想市場的事。",
    choices: [{ id: "continue", label: "……", primary: true }],
  },
  look_reply: {
    speaker: "小伴",
    text: "可以。不過不用一次看完——我們先坐一下，其他的之後再慢慢看。",
    choices: [{ id: "continue", label: "好", primary: true }],
  },
  rest: {
    speaker: "小伴",
    text: "今天先到這裡。你隨時可以再來。",
    choices: [{ id: "again", label: "再坐一次", primary: true }],
  },
};

/** Quiet beat (ms) with card hidden — just room + breathe. */
export const QUIET_MS = 2800;
