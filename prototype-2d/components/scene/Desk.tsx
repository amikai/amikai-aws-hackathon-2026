"use client";

import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

export default function Desk({ active }: { active: boolean }) {
  return (
    <g>
      {/* 桌面與桌腳 */}
      <rect x={1080} y={640} width={380} height={26} rx={10} fill={palette.wood} />
      <rect x={1100} y={666} width={22} height={130} fill={palette.woodDark} />
      <rect x={1420} y={666} width={22} height={130} fill={palette.woodDark} />
      {/* 檯燈 */}
      <rect x={1390} y={560} width={10} height={80} fill={palette.woodDark} />
      <path d="M1368 560 h54 l-13 -30 h-28 z" fill={palette.amber} />
      {/* 日記本 */}
      <rect x={1160} y={606} width={110} height={34} rx={6} fill={palette.coral} />
      <line x1={1215} y1={606} x2={1215} y2={640} stroke={palette.cream} strokeWidth={3} />
      <Highlight x={1140} y={590} width={150} height={64} show={active} />
    </g>
  );
}
