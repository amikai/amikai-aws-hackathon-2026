export type MarketState = "CALM" | "STORM";

export type StoryStep =
  | "ARRIVAL"
  | "SIT_TOGETHER"
  | "GROUNDING"
  | "PLAN_RECALL"
  | "RADIO_EXPLORE"
  | "FOOTPRINT_EXPLORE"
  | "TIMESCALE"
  | "REFLECTION"
  | "DIARY"
  | "REST";

export type ReflectionChoice = "KEEP" | "ADJUST" | "WAIT" | "UNSURE";

export interface ExperienceState {
  step: StoryStep;
  market: MarketState;
  windowClosed: boolean;
  reflection: ReflectionChoice | null;
}

export type ExperienceAction =
  | { type: "CHOOSE_LOOK" }
  | { type: "CHOOSE_SIT" }
  | { type: "ADVANCE" }
  | { type: "CHOOSE_REFLECTION"; choice: ReflectionChoice }
  | { type: "LEAVE" }
  | { type: "TOGGLE_MARKET" }
  | { type: "RESTART" };
