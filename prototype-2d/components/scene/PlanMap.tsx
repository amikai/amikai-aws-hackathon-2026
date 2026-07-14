"use client";

import Highlight from "./Highlight";
import { palette } from "@/lib/palette";

export default function PlanMap({ active }: { active: boolean }) {
  return (
    <g>
      <rect x={700} y={180} width={280} height={200} rx={14} fill="#F7EFDF" stroke="#D9C9AC" strokeWidth={4} />
      <polyline points="730,340 790,300 850,310 910,260 950,240" fill="none" stroke={palette.sage} strokeWidth={6} strokeLinecap="round" />
      {[[730, 340], [790, 300], [850, 310], [910, 260]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={9} fill={palette.sage} />
      ))}
      {/* 明天的節點：尚未完成 */}
      <circle cx={950} cy={240} r={10} fill={palette.cream} stroke={palette.coral} strokeWidth={5} />
      <Highlight x={692} y={172} width={296} height={216} show={active} />
    </g>
  );
}
