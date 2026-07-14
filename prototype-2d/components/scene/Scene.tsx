"use client";

import type { ExperienceState } from "@/lib/types";
import { activeTargetForStep } from "@/lib/targets";
import Room from "./Room";
import SkyWindow from "./SkyWindow";
import PlanMap from "./PlanMap";
import Radio from "./Radio";
import Footprints from "./Footprints";
import Desk from "./Desk";
import Companion from "./Companion";

export default function Scene({ state, reducedMotion }: { state: ExperienceState; reducedMotion: boolean }) {
  const target = activeTargetForStep[state.step];
  return (
    <svg viewBox="0 0 1600 900" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="股伴的小屋">
      <Room market={state.market} />
      <SkyWindow market={state.market} windowClosed={state.windowClosed} reducedMotion={reducedMotion} />
      <PlanMap active={target === "plan"} />
      <Radio active={target === "radio"} />
      <Footprints active={target === "footprints"} reducedMotion={reducedMotion} />
      <Desk active={target === "diary"} />
      <Companion step={state.step} reducedMotion={reducedMotion} />
    </svg>
  );
}
