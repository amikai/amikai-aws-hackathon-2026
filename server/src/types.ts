export type BeatId =
  | "arrival"
  | "sit_reply"
  | "ground"
  | "plan"
  | "radio"
  | "feet"
  | "scale"
  | "reflect"
  | "diary"
  | "rest";

/**
 * Mirrors prototype/src/game/story.ts's MAIN_ORDER exactly.
 * Keep these two arrays in sync if the frontend's main path changes.
 */
export const MAIN_ORDER: BeatId[] = [
  "ground",
  "plan",
  "radio",
  "feet",
  "scale",
  "reflect",
  "diary",
];

export interface FactBlock {
  title: string;
  lines: string[];
}

export interface RecentEvent {
  date: string;
  beat: BeatId;
  choice: string | null;
  /** Compact single-line digest for memory/prompt reuse — not the FactBlock shown to the player. */
  fact: string;
  textExcerpt: string;
}

export interface UserState {
  userId: string;
  currentDate: string;
  visitCount: number;
  mainIndex: number;
  summary: string;
  recentEvents: RecentEvent[];
  updatedAt: string;
}

export interface BeatRequestBody {
  beat: BeatId;
  choice?: string;
}

export interface BeatResponseBody {
  text: string;
  fact?: FactBlock;
}

export interface SessionStartResponseBody {
  currentDate: string;
  mainIndex: number;
  visitCount: number;
}
