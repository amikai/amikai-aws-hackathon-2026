import type { StoryStep } from "./types";

export type SceneTarget = "plan" | "radio" | "footprints" | "diary";

export const activeTargetForStep: Partial<Record<StoryStep, SceneTarget>> = {
  PLAN_RECALL: "plan",
  RADIO_EXPLORE: "radio",
  FOOTPRINT_EXPLORE: "footprints",
  TIMESCALE: "plan",
  DIARY: "diary",
};
