"use client";

import { motion } from "framer-motion";
import { palette } from "@/lib/palette";

export default function Highlight({ x, y, width, height, show }: {
  x: number; y: number; width: number; height: number; show: boolean;
}) {
  if (!show) return null;
  return (
    <motion.rect
      x={x} y={y} width={width} height={height} rx={18}
      fill="none" stroke={palette.amber} strokeWidth={5}
      animate={{ opacity: [0.15, 0.85, 0.15] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
