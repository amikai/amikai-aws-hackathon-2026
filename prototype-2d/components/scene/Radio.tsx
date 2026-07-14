"use client";

import { motion } from "framer-motion";
import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

export default function Radio({ active }: { active: boolean }) {
  return (
    <g>
      {/* 矮櫃 */}
      <rect x={1120} y={430} width={240} height={130} rx={12} fill={palette.beige} stroke={palette.ink} strokeOpacity={0.1} strokeWidth={3} />
      {/* 收音機 */}
      <rect x={1150} y={330} width={180} height={100} rx={16} fill="#D8B98E" />
      <circle cx={1200} cy={380} r={28} fill={palette.woodDark} />
      <rect x={1250} y={355} width={60} height={10} rx={5} fill={palette.woodDark} />
      <rect x={1250} y={375} width={60} height={10} rx={5} fill={palette.woodDark} />
      {/* 聲波 */}
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d={`M ${1345 + i * 18} ${358 - i * 8} q ${12 + i * 4} 22 0 ${44 + i * 14}`}
          fill="none" stroke={palette.coral} strokeWidth={4} strokeLinecap="round"
          animate={active ? { opacity: [0.2, 0.9, 0.2] } : { opacity: 0.25 }}
          transition={active ? { duration: 1.6, repeat: Infinity, delay: i * 0.2 } : { duration: 0.3 }}
        />
      ))}
      <Highlight x={1138} y={318} width={214} height={126} show={active} />
    </g>
  );
}
