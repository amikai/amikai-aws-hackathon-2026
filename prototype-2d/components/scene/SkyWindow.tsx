import { palette } from "@/lib/palette";
import type { MarketState } from "@/lib/types";

export default function SkyWindow({ market, windowClosed, reducedMotion }: {
  market: MarketState; windowClosed: boolean; reducedMotion: boolean;
}) {
  void reducedMotion;
  return (
    <g>
      <rect x={220} y={150} width={340} height={280} rx={18} fill={market === "STORM" ? palette.skyStorm : palette.skyCalm} />
      {/* 窗簾 */}
      <rect x={214} y={144} width={352} height={windowClosed ? 200 : 46} rx={12} fill={palette.beige} />
      {/* 窗框 */}
      <rect x={208} y={138} width={364} height={304} rx={20} fill="none" stroke={palette.ink} strokeOpacity={0.25} strokeWidth={10} />
      <line x1={390} y1={150} x2={390} y2={430} stroke={palette.ink} strokeOpacity={0.2} strokeWidth={6} />
    </g>
  );
}
