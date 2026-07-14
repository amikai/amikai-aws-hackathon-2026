"use client";

import type { Dispatch } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { restCopy, stepCopy } from "@/lib/copy";
import type { ExperienceAction, ExperienceState, StoryStep } from "@/lib/types";

const LEAVE_STEPS = new Set<StoryStep>([
  "GROUNDING", "PLAN_RECALL", "RADIO_EXPLORE", "FOOTPRINT_EXPLORE", "TIMESCALE", "REFLECTION",
]);

export default function DialoguePanel({ state, dispatch }: {
  state: ExperienceState;
  dispatch: Dispatch<ExperienceAction>;
}) {
  const copy = state.step === "REST" ? restCopy : stepCopy[state.step];
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-auto w-full max-w-2xl rounded-3xl border border-[#E5D9C3] bg-[#FBF7EF]/95 p-6 shadow-xl"
        >
          <p className="text-xs tracking-widest text-[#A08F76]">{copy.eyebrow}</p>
          <p className="mt-2 text-lg leading-relaxed">{copy.dialogue}</p>
          {copy.hint && (
            <p className="mt-2 whitespace-pre-line rounded-xl bg-[#F4EDE0] p-3 text-sm text-[#8A7B63]">{copy.hint}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {copy.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => dispatch(opt.action)}
                className="rounded-full bg-[#EFE4D3] px-5 py-2.5 transition hover:bg-[#E7D8BF]"
              >
                {opt.label}
              </button>
            ))}
            {LEAVE_STEPS.has(state.step) && (
              <button
                onClick={() => dispatch({ type: "LEAVE" })}
                className="rounded-full px-3 py-2.5 text-sm text-[#A08F76] underline-offset-4 hover:underline"
              >
                今天先到這裡
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
