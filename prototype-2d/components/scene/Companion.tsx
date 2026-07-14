"use client";

import { motion } from "framer-motion";
import { palette } from "@/lib/palette";
import type { StoryStep } from "@/lib/types";

const POSES: Record<StoryStep, { x: number; y: number; sit?: boolean }> = {
  ARRIVAL: { x: 800, y: 545 },
  SIT_TOGETHER: { x: 780, y: 575, sit: true },
  GROUNDING: { x: 500, y: 545 },
  PLAN_RECALL: { x: 880, y: 530 },
  RADIO_EXPLORE: { x: 1060, y: 545 },
  FOOTPRINT_EXPLORE: { x: 480, y: 600, sit: true },
  TIMESCALE: { x: 800, y: 545 },
  REFLECTION: { x: 800, y: 545 },
  DIARY: { x: 1150, y: 580 },
  REST: { x: 800, y: 570, sit: true },
};

export default function Companion({ step, reducedMotion }: { step: StoryStep; reducedMotion: boolean }) {
  const pose = POSES[step];
  return (
    <motion.g
      initial={false}
      animate={{ x: pose.x, y: pose.y }}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 50, damping: 15 }}
    >
      <g transform="scale(1.15)">
        {/* 呼吸：以底部為原點的縮放循環 */}
        <motion.g
          animate={reducedMotion ? undefined : { scaleY: [1, 1.045, 1] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}
        >
          {/* 尾巴 */}
          <circle cx={54} cy={28} r={14} fill={palette.sage} />
          {/* 身體：坐姿壓扁 */}
          <motion.ellipse
            cx={0} cy={20} rx={62}
            initial={false}
            animate={{ ry: pose.sit ? 46 : 56 }}
            transition={{ duration: 0.5 }}
            fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3}
          />
          {/* 耳朵 */}
          <circle cx={-34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
          <circle cx={34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
          {/* 頭 */}
          <circle cx={0} cy={-34} r={44} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
          {/* 眼睛：眨眼 */}
          {[-16, 16].map((ex) => (
            <motion.ellipse
              key={ex}
              cx={ex} cy={-36} rx={5} ry={7} fill={palette.ink}
              animate={reducedMotion ? undefined : { scaleY: [1, 1, 0.12, 1] }}
              transition={{ duration: 4.2, times: [0, 0.9, 0.94, 1], repeat: Infinity }}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            />
          ))}
          {/* 腮紅 */}
          <circle cx={-28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
          <circle cx={28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
        </motion.g>
      </g>
    </motion.g>
  );
}
