/**
 * Room layout data in normalized image space (0–1).
 * Hotspots only — no walk poly / collision (click-to-explore, not RPG).
 */

export type NormPoint = { x: number; y: number };

export type InteractableDef = {
  id: string;
  label: string;
  /** Center of interaction zone (normalized). */
  x: number;
  y: number;
  /** Zone half-size in normalized units. */
  radius: number;
  prompt: string;
};

/**
 * Companion sit pose — left zabuton by the tea table (normalized).
 * Tweak x/y if she drifts off the cushion after fitRoom.
 */
/**
 * Sit on the beige floor cushion (lower-right of tea table).
 * Back-view art still reads as looking toward the shoji/window.
 */
export const COMPANION_SIT: NormPoint = { x: 0.655, y: 0.735 };

/**
 * Display scale for player-sit.png (~253×450 back-sit).
 * Multiplies with room layerScale.
 */
export const COMPANION_BASE_SCALE = 0.36;

/** Click hotspots mapped to room art. */
export const INTERACTABLES: InteractableDef[] = [
  {
    id: "tea_table",
    label: "茶席",
    x: 0.52,
    y: 0.55,
    radius: 0.07,
    prompt: "點擊茶席 · 安定／熱飲",
  },
  {
    id: "radio",
    label: "收音機",
    x: 0.63,
    y: 0.36,
    radius: 0.045,
    prompt: "點擊收音機 · 論壇聲量",
  },
  {
    id: "bookshelf",
    label: "書櫃",
    x: 0.78,
    y: 0.40,
    radius: 0.05,
    prompt: "點擊書櫃 · 日記／路線",
  },
];
