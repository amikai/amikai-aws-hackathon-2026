/**
 * Room layout in normalized image space (0–1).
 * Gaze targets + click hotspots for the 8-beat path.
 */

export type NormPoint = { x: number; y: number };

export type InteractableDef = {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
};

/** Sit on beige cushion, lower-right of tea table. */
export const COMPANION_SIT: NormPoint = { x: 0.655, y: 0.735 };

/** Display scale for player-sit.png; multiplies with room layerScale. */
export const COMPANION_BASE_SCALE = 0.36;

/** Gaze / hotspot anchors aligned to tea-room art. */
export const GAZE_POINTS: Record<
  "window" | "tea" | "bookshelf" | "radio" | "door",
  NormPoint & { radius: number }
> = {
  window: { x: 0.22, y: 0.28, radius: 0.08 },
  tea: { x: 0.52, y: 0.52, radius: 0.07 },
  bookshelf: { x: 0.78, y: 0.40, radius: 0.055 },
  radio: { x: 0.63, y: 0.36, radius: 0.045 },
  door: { x: 0.18, y: 0.55, radius: 0.07 },
};
