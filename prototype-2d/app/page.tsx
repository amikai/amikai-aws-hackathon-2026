"use client";

import { useEffect, useReducer, useState } from "react";
import Scene from "@/components/scene/Scene";
import DialoguePanel from "@/components/ui/DialoguePanel";
import SimBadge from "@/components/ui/SimBadge";
import { experienceReducer, initialState } from "@/lib/experience-machine";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function Home() {
  const [state, dispatch] = useReducer(experienceReducer, initialState);
  const reducedMotion = useReducedMotion();

  return (
    <main className="relative h-dvh w-dvw overflow-hidden">
      <Scene state={state} reducedMotion={reducedMotion} />
      <SimBadge />
      <button
        onClick={() => dispatch({ type: "TOGGLE_MARKET" })}
        className="absolute right-4 top-4 rounded-full bg-[#EFE4D3]/85 px-4 py-1.5 text-xs text-[#8A7B63] transition hover:bg-[#E7D8BF]"
      >
        {state.market === "STORM" ? "外面：風雨" : "外面：平靜"}
      </button>
      <DialoguePanel state={state} dispatch={dispatch} />
    </main>
  );
}
