import type { ExperienceAction, ExperienceState, StoryStep } from "./types";

export const initialState: ExperienceState = {
  step: "ARRIVAL",
  market: "STORM",
  windowClosed: false,
  reflection: null,
};

const mainPath: StoryStep[] = [
  "GROUNDING",
  "PLAN_RECALL",
  "RADIO_EXPLORE",
  "FOOTPRINT_EXPLORE",
  "TIMESCALE",
  "REFLECTION",
];

export function experienceReducer(state: ExperienceState, action: ExperienceAction): ExperienceState {
  switch (action.type) {
    case "CHOOSE_LOOK":
      return state.step === "ARRIVAL" ? { ...state, step: "GROUNDING", windowClosed: true } : state;
    case "CHOOSE_SIT":
      return state.step === "ARRIVAL" ? { ...state, step: "SIT_TOGETHER" } : state;
    case "ADVANCE": {
      const idx = mainPath.indexOf(state.step);
      if (idx >= 0 && idx < mainPath.length - 1) {
        return { ...state, step: mainPath[idx + 1] };
      }
      if (state.step === "DIARY" || state.step === "SIT_TOGETHER") {
        return { ...state, step: "REST" };
      }
      return state;
    }
    case "CHOOSE_REFLECTION":
      return state.step === "REFLECTION" ? { ...state, step: "DIARY", reflection: action.choice } : state;
    case "LEAVE":
      return { ...state, step: "REST" };
    case "TOGGLE_MARKET":
      return { ...state, market: state.market === "CALM" ? "STORM" : "CALM" };
    case "RESTART":
      return { ...initialState, market: state.market };
    default:
      return state;
  }
}
