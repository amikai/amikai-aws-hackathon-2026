import { palette } from "@/lib/palette";
import type { MarketState } from "@/lib/types";

export default function Room({ market }: { market: MarketState }) {
  return (
    <g>
      <rect x={0} y={0} width={1600} height={620} fill={palette.wall} />
      <rect x={0} y={620} width={1600} height={280} fill={palette.floor} />
      {/* 門 */}
      <rect x={40} y={280} width={140} height={340} rx={10} fill={palette.beige} stroke={palette.ink} strokeOpacity={0.15} strokeWidth={4} />
      <circle cx={160} cy={455} r={7} fill={palette.woodDark} />
      {/* 暖燈光暈：STORM 時增強 */}
      <defs>
        <radialGradient id="lampGlow">
          <stop offset="0%" stopColor={palette.amber} stopOpacity={market === "STORM" ? 0.5 : 0.28} />
          <stop offset="100%" stopColor={palette.amber} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={1340} cy={500} r={280} fill="url(#lampGlow)" />
    </g>
  );
}
