import { palette } from "@/lib/palette";
import type { StoryStep } from "@/lib/types";

export default function Companion({ step, reducedMotion }: { step: StoryStep; reducedMotion: boolean }) {
  void step;
  void reducedMotion;
  return (
    <g transform="translate(800 545) scale(1.15)">
      {/* 尾巴 */}
      <circle cx={54} cy={28} r={14} fill={palette.sage} />
      {/* 身體 */}
      <ellipse cx={0} cy={20} rx={62} ry={56} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      {/* 耳朵 */}
      <circle cx={-34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      <circle cx={34} cy={-58} r={16} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      {/* 頭 */}
      <circle cx={0} cy={-34} r={44} fill="#F2E7D2" stroke="#DECCAA" strokeWidth={3} />
      {/* 眼睛與腮紅 */}
      <ellipse cx={-16} cy={-36} rx={5} ry={7} fill={palette.ink} />
      <ellipse cx={16} cy={-36} rx={5} ry={7} fill={palette.ink} />
      <circle cx={-28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
      <circle cx={28} cy={-22} r={6} fill={palette.coral} opacity={0.5} />
    </g>
  );
}
