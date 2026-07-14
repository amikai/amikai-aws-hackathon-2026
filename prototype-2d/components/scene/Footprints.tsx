"use client";

import { motion } from "framer-motion";
import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

const STEPS: Array<[number, number]> = [
  [520, 700], [470, 742], [410, 702], [356, 746], [300, 706], [248, 748],
];

export default function Footprints({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  return (
    <g>
      {STEPS.map(([x, y], i) => (
        <g key={i} transform={`rotate(-70 ${x} ${y})`}>
          <motion.ellipse
            cx={x} cy={y} rx={16} ry={26} fill={palette.footprint}
            animate={active && !reducedMotion ? { opacity: [0.25, 0.8, 0.25] } : { opacity: 0.4 }}
            transition={active && !reducedMotion ? { duration: 2.4, repeat: Infinity, delay: i * 0.25 } : { duration: 0.3 }}
          />
        </g>
      ))}
      <Highlight x={216} y={656} width={350} height={126} show={active} />
    </g>
  );
}
