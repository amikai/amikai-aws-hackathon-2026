"use client";

import { motion } from "framer-motion";
import { palette } from "@/lib/palette";
import type { MarketState } from "@/lib/types";

// 決定性位置，避免 SSR/CSR 不一致
const DROPS = Array.from({ length: 22 }, (_, i) => ({
  x: 236 + ((i * 53) % 300),
  delay: (i % 7) * 0.16,
}));

export default function SkyWindow({ market, windowClosed, reducedMotion }: {
  market: MarketState; windowClosed: boolean; reducedMotion: boolean;
}) {
  const storm = market === "STORM";
  return (
    <g>
      <defs>
        <clipPath id="windowClip">
          <rect x={220} y={150} width={340} height={280} rx={18} />
        </clipPath>
      </defs>
      {/* 天空 */}
      <motion.rect
        x={220} y={150} width={340} height={280} rx={18}
        initial={false}
        animate={{ fill: storm ? palette.skyStorm : palette.skyCalm }}
        transition={{ duration: 1.2 }}
      />
      {/* 雨：只在 STORM；reduced-motion 用靜態霧面替代 */}
      <g clipPath="url(#windowClip)">
        {storm && !reducedMotion && DROPS.map((d, i) => (
          <motion.line
            key={i}
            x1={d.x} y1={140} x2={d.x - 8} y2={164}
            stroke={palette.rain} strokeWidth={3} strokeLinecap="round"
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: 300, opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.15, repeat: Infinity, delay: d.delay, ease: "linear" }}
          />
        ))}
        {storm && reducedMotion && (
          <rect x={220} y={150} width={340} height={280} fill={palette.rain} opacity={0.18} />
        )}
      </g>
      {/* 窗簾 */}
      <motion.rect
        x={214} y={144} width={352} rx={12} fill={palette.beige}
        initial={false}
        animate={{ height: windowClosed ? 200 : 46 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 1.4, ease: "easeInOut" }}
      />
      {/* 窗框 */}
      <rect x={208} y={138} width={364} height={304} rx={20} fill="none" stroke={palette.ink} strokeOpacity={0.25} strokeWidth={10} />
      <line x1={390} y1={150} x2={390} y2={430} stroke={palette.ink} strokeOpacity={0.2} strokeWidth={6} />
    </g>
  );
}
